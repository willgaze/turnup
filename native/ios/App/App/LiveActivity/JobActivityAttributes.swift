import ActivityKit
import Foundation

/// The current job, as the lock screen sees it.
///
/// This is the TRADE's own phone, so the job is theirs to see: the customer's
/// first name and the street, the stage and when it was tapped. Nothing here is
/// a prediction; `since` is the time the stage was set, not an arrival time.
/// Shared by the app (which starts and updates the activity) and the widget
/// extension (which draws it), so it must stay a plain value type.
struct JobActivityAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        /// BOOKED | ON_MY_WAY | ON_SITE | PAUSED | DONE
        var stage: String
        /// "On my way", "On site", "Paused", "Job done"
        var stageLabel: String
        /// When that stage was tapped.
        var since: Date
        /// The stage note, if any ("Gone for a part").
        var note: String?
    }

    /// The tracker id the dashboard PATCHes, so a button on the lock screen
    /// can move the same job.
    var trackerId: String
    var code: String
    var customer: String
    var address: String
}
