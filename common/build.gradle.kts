plugins {
    `java-library`
}

dependencies {
    implementation("com.fasterxml.jackson.core:jackson-annotations")
}

tasks.named<org.springframework.boot.gradle.tasks.bundling.BootJar>("bootJar") {
    enabled = false
}

tasks.named<Jar>("jar") {
    enabled = true
    archiveClassifier.set("")
}