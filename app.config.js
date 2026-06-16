module.exports = {
  expo: {
    name: "SPLIIT",
    slug: "spliit",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#5C6BC0",
    },
    ios: {
      supportsTablet: false,
      bundleIdentifier: "com.spliit.app",
    },
    android: {
      // EAS injects GOOGLE_SERVICES_JSON as a file path during cloud builds;
      // falls back to the local file for development.
      googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? "./google-services.json",
      adaptiveIcon: {
        foregroundImage: "./assets/android-icon-foreground.png",
        backgroundImage: "./assets/android-icon-background.png",
        monochromeImage: "./assets/android-icon-monochrome.png",
        backgroundColor: "#5C6BC0",
      },
      package: "com.spliit.app",
      permissions: [
        "android.permission.READ_CONTACTS",
        "android.permission.CAMERA",
        "android.permission.READ_EXTERNAL_STORAGE",
        "android.permission.RECEIVE_BOOT_COMPLETED",
        "android.permission.VIBRATE",
      ],
    },
    web: {
      favicon: "./assets/favicon.png",
    },
    plugins: [
      "expo-status-bar",
      "expo-secure-store",
      [
        "expo-build-properties",
        {
          android: {
            enableProguardInReleaseBuilds: false,
            enableShrinkResourcesInReleaseBuilds: false,
          },
        },
      ],
      [
        "expo-contacts",
        {
          contactsPermission: "Allow SPLIIT to access your contacts to add group members.",
        },
      ],
      [
        "expo-notifications",
        {
          icon: "./assets/icon.png",
          color: "#5C6BC0",
          androidMode: "default",
        },
      ],
      [
        "expo-image-picker",
        {
          photosPermission: "Allow SPLIIT to access your photos to attach receipts.",
          cameraPermission: "Allow SPLIIT to use your camera to photograph receipts.",
        },
      ],
    ],
    extra: {
      eas: {
        projectId: "65ee55ef-d71e-4557-87c4-bc6712f2d771",
      },
    },
  },
};
