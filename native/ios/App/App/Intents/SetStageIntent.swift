import AppIntents
import Foundation

/// A button on the lock screen: On site, Paused, Job done.
///
/// Runs in the widget's process, without the dashboard's cookies, so it sends
/// the operator token the app stored in the App Group. The server treats it
/// exactly like a tap on the dashboard: same PATCH, same record, same push to
/// the customer. The activity itself is updated by the dashboard's next poll
/// (or, once the app is open, by the plugin), so this intent does not guess at
/// the new state — it asks the server and lets the answer come back.
@available(iOS 17.0, *)
struct SetStageIntent: AppIntent {
    static var title: LocalizedStringResource = "Set job stage"
    static var isDiscoverable = false

    @Parameter(title: "Tracker") var trackerId: String
    @Parameter(title: "Stage") var stage: String

    init() {}
    init(trackerId: String, stage: String) { self.trackerId = trackerId; self.stage = stage }

    func perform() async throws -> some IntentResult {
        guard let token = UserDefaults(suiteName: "group.com.getturnup.app")?.string(forKey: "operatorToken") else {
            return .result()
        }
        var request = URLRequest(url: URL(string: "https://www.getturnup.com/api/dashboard/trackers/\(trackerId)")!)
        request.httpMethod = "PATCH"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        let tapId = "la-" + UUID().uuidString.lowercased().replacingOccurrences(of: "-", with: "").prefix(20)
        let body: [String: Any] = ["stage": stage, "tapId": String(tapId), "deviceAt": ISO8601DateFormatter().string(from: Date())]
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        _ = try? await URLSession.shared.data(for: request)
        return .result()
    }
}
