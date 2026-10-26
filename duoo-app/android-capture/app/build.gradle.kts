import org.jetbrains.kotlin.gradle.dsl.JvmTarget

val duooVersionCode = providers.gradleProperty("duooVersionCode").orNull?.toIntOrNull() ?: 1
val duooVersionName = providers.gradleProperty("duooVersionName").orNull ?: "0.1.0"

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.duoo.capture"
    compileSdk = 35
    buildToolsVersion = "35.0.0"

    buildFeatures {
        buildConfig = true
    }

    defaultConfig {
        applicationId = "com.duoo.capture"
        minSdk = 26
        targetSdk = 35
        versionCode = duooVersionCode
        versionName = duooVersionName
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

kotlin {
    compilerOptions {
        jvmTarget = JvmTarget.JVM_17
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.15.0")
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("androidx.work:work-runtime-ktx:2.10.0")
    implementation("com.google.android.material:material:1.12.0")
}
