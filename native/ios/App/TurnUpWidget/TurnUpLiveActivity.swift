import ActivityKit
import WidgetKit
import SwiftUI
import AppIntents

/// The job on the lock screen and in the Dynamic Island.
///
/// Same rules as the customer's card: the stage and the time it was set, the
/// note, and buttons for the stages that come next. No countdown, no "arriving
/// in": the product reports what happened and never predicts.
struct TurnUpLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: JobActivityAttributes.self) { context in
            LockScreenView(context: context)
                .activityBackgroundTint(Color(.systemBackground).opacity(0.85))
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    Text(context.attributes.customer).font(.headline).lineLimit(1)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    Text(context.state.stageLabel).font(.headline).foregroundStyle(tint(context.state.stage))
                }
                DynamicIslandExpandedRegion(.bottom) {
                    StageButtons(trackerId: context.attributes.trackerId, stage: context.state.stage)
                }
            } compactLeading: {
                Image(systemName: icon(context.state.stage)).foregroundStyle(tint(context.state.stage))
            } compactTrailing: {
                Text(context.state.since, style: .time).font(.caption2)
            } minimal: {
                Image(systemName: icon(context.state.stage)).foregroundStyle(tint(context.state.stage))
            }
        }
    }
}

struct LockScreenView: View {
    let context: ActivityViewContext<JobActivityAttributes>
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(alignment: .firstTextBaseline) {
                Image(systemName: icon(context.state.stage)).foregroundStyle(tint(context.state.stage))
                Text(context.state.stageLabel).font(.title3.weight(.bold))
                Spacer()
                Text("since \(context.state.since, style: .time)").font(.subheadline).foregroundStyle(.secondary)
            }
            Text("\(context.attributes.customer) · \(context.attributes.address)")
                .font(.subheadline).foregroundStyle(.secondary).lineLimit(1)
            if let note = context.state.note, !note.isEmpty {
                Text(note).font(.subheadline).lineLimit(2)
            }
            StageButtons(trackerId: context.attributes.trackerId, stage: context.state.stage)
        }
        .padding(14)
    }
}

/// The stages that come next, and only those. Paused can go back to On site;
/// On my way offers On site; everything offers Job done once on site.
struct StageButtons: View {
    let trackerId: String
    let stage: String
    var next: [(String, String)] {
        switch stage {
        case "ON_MY_WAY": return [("ON_SITE", "On site"), ("PAUSED", "Paused")]
        case "ON_SITE":   return [("PAUSED", "Paused"), ("DONE", "Job done")]
        case "PAUSED":    return [("ON_SITE", "Back on site"), ("DONE", "Job done")]
        default:          return []
        }
    }
    var body: some View {
        if #available(iOS 17.0, *), !next.isEmpty {
            HStack(spacing: 8) {
                ForEach(next, id: \.0) { key, label in
                    Button(intent: SetStageIntent(trackerId: trackerId, stage: key)) {
                        Text(label).font(.subheadline.weight(.semibold)).frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(tint(key))
                }
            }
        }
    }
}

func icon(_ stage: String) -> String {
    switch stage {
    case "ON_MY_WAY": return "car.fill"
    case "ON_SITE":   return "wrench.and.screwdriver.fill"
    case "PAUSED":    return "pause.circle.fill"
    case "DONE":      return "checkmark.circle.fill"
    default:          return "calendar"
    }
}

/// The stage colours from globals.css, so the lock screen and the card agree.
func tint(_ stage: String) -> Color {
    switch stage {
    case "ON_MY_WAY": return Color(red: 0.00, green: 0.48, blue: 1.00)
    case "ON_SITE":   return Color(red: 0.35, green: 0.34, blue: 0.84)
    case "PAUSED":    return Color(red: 1.00, green: 0.58, blue: 0.00)
    case "DONE":      return Color(red: 0.20, green: 0.78, blue: 0.35)
    default:          return .secondary
    }
}
