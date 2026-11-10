plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "fr.retrobus.console"
    compileSdk = 35

    defaultConfig {
        applicationId = "fr.retrobus.console"
        minSdk = 29
        targetSdk = 35
        versionCode = 2611006
        versionName = "26.11.006"
        buildConfigField("String", "API_BASE", "\"https://attractive-kindness-rbe-serveurs.up.railway.app\"")
    }

    buildFeatures {
        buildConfig = true
    }

    buildTypes {
        release {
            isMinifyEnabled = false
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.15.0")
}
