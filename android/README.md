# 행복하자 우리 — 안드로이드 WebView 앱

이 폴더는 `/index.html` 웹앱을 그대로 감싸 **APK** 로 만드는 안드로이드 프로젝트입니다.

## 특징

- **웹 자산을 APK 안에 번들** — `WebViewAssetLoader` 로 `https://appassets.androidplatform.net/` 에서 서빙합니다.
  `file://` 이 아니라 https 출처라서 `localStorage` · 카메라 · 마이크가 웹과 똑같이 동작하고, **오프라인에서도 열립니다.**
- **자동 동기화** — 빌드하면 레포 루트의 `index.html` 과 `assets/` 가 `app/src/main/assets/web/` 으로 자동 복사됩니다.
  웹을 수정하고 다시 빌드하기만 하면 됩니다. (`app/build.gradle.kts` 의 `copyWebAssets` 태스크)
- **하드웨어 뒤로가기** → 웹 해시 라우터의 히스토리를 되돌립니다. 최상단에서 한 번 더 누르면 종료.
- **safe-area 대응** — edge-to-edge + `shortEdges` 라서 웹의 `env(safe-area-inset-*)` 가 노치·제스처바를 피해 갑니다.
- **권한 연결** — 보이스룸 마이크(`RECORD_AUDIO`), 프로필 사진·증빙 첨부(파일 선택기)를 웹에서 호출하면 시스템 권한창이 뜹니다.
- **외부 링크** — 카카오T·지도·결제 등 외부 도메인은 WebView 대신 해당 앱/브라우저로 넘깁니다.
- **당겨서 새로고침** — 최상단에서만 동작해 리스트·채팅 스크롤과 충돌하지 않습니다.

## 빌드 방법

### 1) Android Studio (권장)

1. Android Studio 에서 **Open** → 이 `android` 폴더 선택
2. Gradle 동기화가 끝나면 상단 ▶ 실행 (기기/에뮬레이터)
3. APK 파일이 필요하면 **Build → Build Bundle(s) / APK(s) → Build APK(s)**
   → `app/build/outputs/apk/debug/app-debug.apk`

### 2) 커맨드라인

Gradle 래퍼 바이너리(`gradlew`, `gradle-wrapper.jar`)는 저장소에 포함하지 않았습니다.
Android Studio 로 한 번 열면 자동 생성되며, 이미 Gradle 이 설치되어 있다면 아래로 만들 수 있습니다.

```bash
cd android
gradle wrapper                 # gradlew 생성 (최초 1회)
./gradlew assembleDebug        # 디버그 APK
./gradlew assembleRelease      # 릴리스 APK (서명 설정 필요)
```

## 배포용 서명

`app/build.gradle.kts` 의 `buildTypes.release` 에 서명 설정을 추가하세요.

```kotlin
signingConfigs {
    create("release") {
        storeFile = file(System.getenv("KEYSTORE_PATH") ?: "release.keystore")
        storePassword = System.getenv("KEYSTORE_PASSWORD")
        keyAlias = System.getenv("KEY_ALIAS")
        keyPassword = System.getenv("KEY_PASSWORD")
    }
}
buildTypes {
    release {
        signingConfig = signingConfigs.getByName("release")
        isMinifyEnabled = true
    }
}
```

키스토어 생성:

```bash
keytool -genkey -v -keystore release.keystore -alias happytogether \
        -keyalg RSA -keysize 2048 -validity 10000
```

> 키스토어와 비밀번호는 **절대 저장소에 커밋하지 마세요.** 분실하면 스토어 업데이트가 불가능합니다.

## 번들 대신 서버 최신본을 띄우고 싶다면

`MainActivity.kt` 의 `START_URL` 을 `REMOTE_URL` 로 바꾸면 됩니다.
그러면 앱 업데이트 없이 웹만 배포해도 즉시 반영되지만, 오프라인에서는 열리지 않습니다.

```kotlin
webView.loadUrl(REMOTE_URL)   // https://park-jongchul.github.io/happyTogether/
```

## 구성

```
android/
├─ settings.gradle.kts
├─ build.gradle.kts
├─ gradle.properties
├─ gradle/wrapper/gradle-wrapper.properties
└─ app/
   ├─ build.gradle.kts            웹 자산 복사 태스크 포함
   ├─ proguard-rules.pro
   └─ src/main/
      ├─ AndroidManifest.xml      권한 · 딥링크
      ├─ java/kr/happytogether/app/
      │  ├─ App.kt
      │  └─ MainActivity.kt       WebView 설정 · 권한 · 뒤로가기
      └─ res/
         ├─ layout/activity_main.xml
         ├─ drawable/             스플래시 · 로고 · 런처 아이콘
         ├─ mipmap-anydpi-v26/    적응형 아이콘
         └─ values/               색상 · 문자열 · 테마
```
