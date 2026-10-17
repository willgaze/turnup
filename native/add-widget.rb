#!/usr/bin/env ruby
# Adds the TurnUpWidget extension target (the Live Activity) to the Xcode
# project Capacitor generated, and the App Group entitlement to both targets.
# Idempotent: run it after every `cap sync ios`, on a Mac or the CI runner.
#
#   gem install xcodeproj   # ships with CocoaPods, so usually already there
#   ruby add-widget.rb
require 'xcodeproj'

PROJECT = File.expand_path('ios/App/App.xcodeproj', __dir__)
project = Xcodeproj::Project.open(PROJECT)
app = project.targets.find { |t| t.name == 'App' } or abort 'no App target'

# --- the shared files: attributes + intent compile into BOTH targets ----------
app_group = project.main_group['App']
def file_ref(group, path)
  group.files.find { |f| f.path == path } || group.new_file(path)
end
la_group = app_group['LiveActivity'] || app_group.new_group('LiveActivity', 'LiveActivity')
intents_group = app_group['Intents'] || app_group.new_group('Intents', 'Intents')
attrs = file_ref(la_group, 'JobActivityAttributes.swift')
plugin = file_ref(la_group, 'LiveActivityPlugin.swift')
intent = file_ref(intents_group, 'SetStageIntent.swift')
[attrs, plugin, intent].each { |f| app.add_file_references([f]) unless app.source_build_phase.files_references.include?(f) }

# --- the widget target --------------------------------------------------------
widget = project.targets.find { |t| t.name == 'TurnUpWidget' }
unless widget
  widget = project.new_target(:app_extension, 'TurnUpWidget', :ios, '17.0')
  widget.product_type = 'com.apple.product-type.app-extension'
  wgroup = project.main_group.new_group('TurnUpWidget', 'TurnUpWidget')
  %w[TurnUpWidgetBundle.swift TurnUpLiveActivity.swift].each { |f| widget.add_file_references([wgroup.new_file(f)]) }
  widget.add_file_references([attrs, intent])
  widget.build_configurations.each do |c|
    c.build_settings['INFOPLIST_FILE'] = 'TurnUpWidget/Info.plist'
    c.build_settings['PRODUCT_BUNDLE_IDENTIFIER'] = 'com.getturnup.app.widget'
    c.build_settings['CODE_SIGN_ENTITLEMENTS'] = 'TurnUpWidget/TurnUpWidget.entitlements'
    c.build_settings['SWIFT_VERSION'] = '5.0'
    c.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '17.0'
    c.build_settings['TARGETED_DEVICE_FAMILY'] = '1'
    c.build_settings['GENERATE_INFOPLIST_FILE'] = 'YES'
    c.build_settings['INFOPLIST_KEY_CFBundleDisplayName'] = 'TurnUp'
    c.build_settings['INFOPLIST_KEY_NSHumanReadableCopyright'] = ''
    c.build_settings['MARKETING_VERSION'] = '1.0'
    c.build_settings['CURRENT_PROJECT_VERSION'] = '1'
  end
  widget.frameworks_build_phase.clear
  %w[WidgetKit SwiftUI ActivityKit AppIntents].each do |fw|
    ref = project.frameworks_group.new_file("System/Library/Frameworks/#{fw}.framework")
    ref.source_tree = 'SDKROOT'
    widget.frameworks_build_phase.add_file_reference(ref)
  end
  app.add_dependency(widget)
  # embed the appex in the app
  embed = app.new_copy_files_build_phase('Embed Foundation Extensions')
  embed.symbol_dst_subfolder_spec = :plug_ins
  bf = embed.add_file_reference(widget.product_reference)
  bf.settings = { 'ATTRIBUTES' => ['RemoveHeadersOnCopy'] }
end

# --- entitlements and the App Group on the app ---------------------------------
app.build_configurations.each do |c|
  c.build_settings['CODE_SIGN_ENTITLEMENTS'] = 'App/App.entitlements'
  c.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '16.2'
end
ent = file_ref(app_group, 'App.entitlements')

project.save
puts "TurnUpWidget target in place: #{project.targets.map(&:name).join(', ')}"
