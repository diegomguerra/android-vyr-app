// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "CapApp-SPM",
    platforms: [.iOS(.v14)],
    products: [
        .library(
            name: "CapApp-SPM",
            targets: ["CapApp-SPM"])
    ],
    dependencies: [
        .package(url: "https://github.com/nicklockwood/SwiftFormat", from: "0.54.6"),
        .package(url: "https://github.com/nicklockwood/iVersion", from: "1.11.5"),
        .package(url: "https://github.com/nicklockwood/iRate", from: "1.12.2"),
    ],
    targets: [
        .target(
            name: "CapApp-SPM",
            dependencies: []),
    ]
)
