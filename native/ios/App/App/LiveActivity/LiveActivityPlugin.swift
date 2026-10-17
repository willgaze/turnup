import Foundation
import Capacitor
import ActivityKit

/// The bridge the dashboard calls. One activity at a time: the job you are on.
///
///   LiveActivity.sync({ trackerId, code, customer, address, stage, stageLabel, since, note })
///   LiveActivity.end()
///   LiveActivity.setToken({ token })   // the operator token the lock-screen buttons use
///
/// `sync` starts an activity if none is running for that job, updates it if one
/// is, and ends any activity for a different job first. Nothing here invents a
/// time: `since` is the server's own stamp for the stage.
@objc(LiveActivityPlugin)
public class LiveActivityPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "LiveActivityPlugin"
    public let jsName = "LiveActivity"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "sync", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "end", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setToken", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "isAvailable", returnType: CAPPluginReturnPromise),
    ]

    @objc func isAvailable(_ call: CAPPluginCall) {
        if #available(iOS 16.2, *) {
            call.resolve(["available": ActivityAuthorizationInfo().areActivitiesEnabled])
        } else {
            call.resolve(["available": false])
        }
    }

    /// The token lives in the shared App Group so the widget's intent can read
    /// it. Keychain would be stricter; UserDefaults in the group is enough for
    /// a token the server can revoke, and it keeps the widget code small.
    @objc func setToken(_ call: CAPPluginCall) {
        guard let token = call.getString("token") else { return call.reject("token missing") }
        SharedStore.defaults?.set(token, forKey: SharedStore.tokenKey)
        call.resolve()
    }

    @objc func sync(_ call: CAPPluginCall) {
        guard #available(iOS 16.2, *) else { return call.resolve(["running": false]) }
        guard let trackerId = call.getString("trackerId"), let code = call.getString("code"),
              let stage = call.getString("stage"), let stageLabel = call.getString("stageLabel") else {
            return call.reject("trackerId, code, stage and stageLabel are required")
        }
        let since = ISO8601DateFormatter().date(from: call.getString("since") ?? "") ?? Date()
        let state = JobActivityAttributes.ContentState(stage: stage, stageLabel: stageLabel, since: since, note: call.getString("note"))

        Task {
            // One job on the lock screen. Anything else running is a job you are no longer on.
            for activity in Activity<JobActivityAttributes>.activities where activity.attributes.trackerId != trackerId {
                await activity.end(nil, dismissalPolicy: .immediate)
            }
            if let running = Activity<JobActivityAttributes>.activities.first(where: { $0.attributes.trackerId == trackerId }) {
                if stage == "DONE" {
                    await running.end(ActivityContent(state: state, staleDate: nil), dismissalPolicy: .after(Date().addingTimeInterval(15 * 60)))
                } else {
                    await running.update(ActivityContent(state: state, staleDate: nil))
                }
                call.resolve(["running": stage != "DONE"])
                return
            }
            if stage == "DONE" || stage == "BOOKED" { call.resolve(["running": false]); return }
            let attributes = JobActivityAttributes(trackerId: trackerId, code: code,
                                                   customer: call.getString("customer") ?? "",
                                                   address: call.getString("address") ?? "")
            do {
                _ = try Activity.request(attributes: attributes, content: ActivityContent(state: state, staleDate: nil), pushType: nil)
                call.resolve(["running": true])
            } catch {
                call.reject("could not start the activity: \(error.localizedDescription)")
            }
        }
    }

    @objc func end(_ call: CAPPluginCall) {
        guard #available(iOS 16.2, *) else { return call.resolve() }
        Task {
            for activity in Activity<JobActivityAttributes>.activities {
                await activity.end(nil, dismissalPolicy: .immediate)
            }
            call.resolve()
        }
    }
}

/// The App Group both targets read. The identifier must match the entitlement
/// `add-widget.rb` writes and the group registered against the App ID.
enum SharedStore {
    static let group = "group.com.getturnup.app"
    static let tokenKey = "operatorToken"
    static var defaults: UserDefaults? { UserDefaults(suiteName: group) }
}
