/**
 * ScreenTimePlugin — Capacitor bridge for Android UsageStatsManager & AccessibilityService.
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │  WEB (browser / PWA):  falls back to localStorage / Zustand store data │
 * │  NATIVE (Android APK): calls real Java plugin via Capacitor bridge      │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * ─── Native Android setup (after exporting to GitHub) ───────────────────────
 *
 * 1. In AndroidManifest.xml add:
 *    <uses-permission android:name="android.permission.PACKAGE_USAGE_STATS"
 *        tools:ignore="ProtectedPermissions" />
 *    <service
 *        android:name=".BlockerAccessibilityService"
 *        android:permission="android.permission.BIND_ACCESSIBILITY_SERVICE"
 *        android:exported="true">
 *      <intent-filter>
 *        <action android:name="android.accessibilityservice.AccessibilityService" />
 *      </intent-filter>
 *      <meta-data
 *        android:name="android.accessibilityservice"
 *        android:resource="@xml/accessibility_service_config" />
 *    </service>
 *
 * 2. Create BlockerAccessibilityService.java (app blocking logic).
 *
 * 3. Create ScreenTimePlugin.java (registers as Capacitor plugin "ScreenTime").
 *    See full Java template below (in JSDoc block at the bottom of this file).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */

// Attempt to import Capacitor — will be undefined in pure-web builds without the package
let CapacitorCore: typeof import("@capacitor/core") | null = null;
try {
  // Dynamic require so tree-shaking keeps the bundle clean when not on native
  CapacitorCore = require("@capacitor/core");
} catch {
  CapacitorCore = null;
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AppUsageInfo {
  packageName: string;   // e.g. "com.instagram.android"
  appName: string;       // e.g. "Instagram"
  totalTimeMs: number;   // milliseconds in foreground
  launchCount: number;   // number of times opened
  iconBase64?: string;   // base64 PNG (native only)
}

export interface UsageStatsResult {
  date: string;                   // YYYY-MM-DD
  totalScreenTimeMs: number;
  apps: AppUsageInfo[];
}

export interface WeeklyStatsResult {
  days: {
    date: string;
    label: string;    // "Seg", "Ter", …
    totalMs: number;
  }[];
}

export interface PermissionResult {
  granted: boolean;
}

// ── Mock / web-fallback data ──────────────────────────────────────────────────

const MOCK_APPS: AppUsageInfo[] = [
  { packageName: "com.instagram.android",   appName: "Instagram",   totalTimeMs: 80 * 60_000,  launchCount: 18 },
  { packageName: "com.google.android.youtube", appName: "YouTube",  totalTimeMs: 45 * 60_000,  launchCount: 9  },
  { packageName: "com.whatsapp",             appName: "WhatsApp",   totalTimeMs: 32 * 60_000,  launchCount: 27 },
  { packageName: "com.zhiliaoapp.musically", appName: "TikTok",     totalTimeMs: 28 * 60_000,  launchCount: 12 },
  { packageName: "com.facebook.katana",      appName: "Facebook",   totalTimeMs: 15 * 60_000,  launchCount: 6  },
  { packageName: "com.twitter.android",      appName: "Twitter / X", totalTimeMs: 12 * 60_000, launchCount: 8  },
  { packageName: "com.netflix.mediaclient",  appName: "Netflix",    totalTimeMs: 60 * 60_000,  launchCount: 3  },
];

const DAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MOCK_WEEK_MS = [72, 95, 140, 88, 102, 210, 165].map((m) => m * 60_000);

function getTodayStr() {
  return new Date().toISOString().split("T")[0];
}

// ── Plugin class ─────────────────────────────────────────────────────────────

class ScreenTimePluginImpl {
  private _native: { [key: string]: (...args: unknown[]) => Promise<unknown> } | null = null;

  private get native() {
    if (this._native) return this._native;
    if (CapacitorCore?.registerPlugin) {
      this._native = CapacitorCore.registerPlugin("ScreenTime") as typeof this._native;
    }
    return this._native;
  }

  private isNative(): boolean {
    return !!(CapacitorCore?.Capacitor?.isNativePlatform?.());
  }

  // ── Permissions ─────────────────────────────────────────────────────────

  /**
   * Check if PACKAGE_USAGE_STATS permission is granted.
   * On web always returns { granted: true } so the dashboard shows mock data.
   */
  async checkPermission(): Promise<PermissionResult> {
    if (this.isNative() && this.native) {
      return (await this.native["checkPermission"]()) as PermissionResult;
    }
    return { granted: true }; // web fallback
  }

  /**
   * Opens Android Settings → Usage Access so the user can grant permission.
   * On web shows an alert explaining what would happen natively.
   */
  async requestPermission(): Promise<void> {
    if (this.isNative() && this.native) {
      await this.native["requestPermission"]();
      return;
    }
    // web fallback — inform developer / tester
    console.info(
      "[ScreenTimePlugin] requestPermission() — no-op on web.\n" +
      "On Android this opens: Settings → Apps → Special app access → Usage access"
    );
  }

  /**
   * Check if BIND_ACCESSIBILITY_SERVICE is enabled.
   */
  async checkAccessibilityPermission(): Promise<PermissionResult> {
    if (this.isNative() && this.native) {
      return (await this.native["checkAccessibilityPermission"]()) as PermissionResult;
    }
    return { granted: false }; // web: not available
  }

  /**
   * Opens Android Accessibility Settings to enable BlockerAccessibilityService.
   */
  async requestAccessibilityPermission(): Promise<void> {
    if (this.isNative() && this.native) {
      await this.native["requestAccessibilityPermission"]();
    }
  }

  // ── Usage Stats ──────────────────────────────────────────────────────────

  /**
   * Returns today's usage stats.
   * Native: queries UsageStatsManager.
   * Web:    returns MOCK_APPS merged with any entries from the Zustand store.
   */
  async getUsageStats(): Promise<UsageStatsResult> {
    if (this.isNative() && this.native) {
      return (await this.native["getUsageStats"]({ range: "today" })) as UsageStatsResult;
    }

    // Web fallback — use mock data
    const total = MOCK_APPS.reduce((a, x) => a + x.totalTimeMs, 0);
    return {
      date: getTodayStr(),
      totalScreenTimeMs: total,
      apps: [...MOCK_APPS].sort((a, b) => b.totalTimeMs - a.totalTimeMs),
    };
  }

  /**
   * Returns the last 7 days of screen time totals.
   */
  async getWeeklyStats(): Promise<WeeklyStatsResult> {
    if (this.isNative() && this.native) {
      return (await this.native["getWeeklyStats"]()) as WeeklyStatsResult;
    }

    // Web fallback
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return {
        date: d.toISOString().split("T")[0],
        label: DAY_LABELS[d.getDay()],
        totalMs: MOCK_WEEK_MS[i],
      };
    });
    return { days };
  }

  // ── App Blocker ──────────────────────────────────────────────────────────

  /**
   * Sends the list of blocked package names to BlockerAccessibilityService.
   * On web the list is only stored in localStorage.
   */
  async setBlockedApps(packageNames: string[]): Promise<void> {
    if (this.isNative() && this.native) {
      await this.native["setBlockedApps"]({ packageNames });
    }
    localStorage.setItem("dominus_blocked_apps", JSON.stringify(packageNames));
  }

  /**
   * Returns the current blocklist.
   */
  async getBlockedApps(): Promise<string[]> {
    if (this.isNative() && this.native) {
      const result = (await this.native["getBlockedApps"]()) as { packageNames: string[] };
      return result.packageNames;
    }
    const stored = localStorage.getItem("dominus_blocked_apps");
    return stored ? JSON.parse(stored) : [];
  }
}

export const ScreenTimePlugin = new ScreenTimePluginImpl();

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Convert milliseconds → "Xh Ymin" string */
export function msToHumanTime(ms: number): string {
  const totalMin = Math.round(ms / 60_000);
  if (totalMin < 60) return `${totalMin}min`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

/** Convert milliseconds → decimal hours (for charts) */
export function msToHours(ms: number): number {
  return Math.round((ms / 3_600_000) * 10) / 10;
}

/**
 * ─── Java template for ScreenTimePlugin.java ────────────────────────────────
 *
 * Place this file at:
 *   android/app/src/main/java/app/lovable/adominus/ScreenTimePlugin.java
 *
 * @see https://capacitorjs.com/docs/plugins/android
 *
 * ```java
 * package app.lovable.adominus;
 *
 * import android.app.usage.UsageStats;
 * import android.app.usage.UsageStatsManager;
 * import android.content.Context;
 * import android.content.Intent;
 * import android.provider.Settings;
 * import com.getcapacitor.JSObject;
 * import com.getcapacitor.JSArray;
 * import com.getcapacitor.Plugin;
 * import com.getcapacitor.PluginCall;
 * import com.getcapacitor.PluginMethod;
 * import com.getcapacitor.annotation.CapacitorPlugin;
 * import java.util.Calendar;
 * import java.util.List;
 * import java.util.Map;
 *
 * @CapacitorPlugin(name = "ScreenTime")
 * public class ScreenTimePlugin extends Plugin {
 *
 *   @PluginMethod
 *   public void checkPermission(PluginCall call) {
 *     JSObject ret = new JSObject();
 *     ret.put("granted", hasUsagePermission());
 *     call.resolve(ret);
 *   }
 *
 *   @PluginMethod
 *   public void requestPermission(PluginCall call) {
 *     Intent intent = new Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS);
 *     intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
 *     getContext().startActivity(intent);
 *     call.resolve();
 *   }
 *
 *   @PluginMethod
 *   public void getUsageStats(PluginCall call) {
 *     if (!hasUsagePermission()) { call.reject("PERMISSION_DENIED"); return; }
 *     UsageStatsManager usm = (UsageStatsManager)
 *       getContext().getSystemService(Context.USAGE_STATS_SERVICE);
 *     Calendar cal = Calendar.getInstance();
 *     long end = cal.getTimeInMillis();
 *     cal.set(Calendar.HOUR_OF_DAY, 0);
 *     cal.set(Calendar.MINUTE, 0);
 *     cal.set(Calendar.SECOND, 0);
 *     long start = cal.getTimeInMillis();
 *     Map<String, UsageStats> statsMap =
 *       usm.queryAndAggregateUsageStats(start, end);
 *     JSArray apps = new JSArray();
 *     long total = 0;
 *     for (Map.Entry<String, UsageStats> e : statsMap.entrySet()) {
 *       UsageStats s = e.getValue();
 *       if (s.getTotalTimeInForeground() < 1000) continue;
 *       JSObject app = new JSObject();
 *       app.put("packageName", s.getPackageName());
 *       app.put("appName", getAppName(s.getPackageName()));
 *       app.put("totalTimeMs", s.getTotalTimeInForeground());
 *       app.put("launchCount", s.getAppLaunchCount());
 *       apps.put(app);
 *       total += s.getTotalTimeInForeground();
 *     }
 *     JSObject ret = new JSObject();
 *     ret.put("totalScreenTimeMs", total);
 *     ret.put("apps", apps);
 *     call.resolve(ret);
 *   }
 *
 *   @PluginMethod
 *   public void setBlockedApps(PluginCall call) {
 *     JSArray names = call.getArray("packageNames");
 *     // Persist to SharedPreferences and notify BlockerAccessibilityService
 *     // (implementation detail — store in shared prefs, service reads on each event)
 *     getContext().getSharedPreferences("dominus", Context.MODE_PRIVATE)
 *       .edit().putString("blocked_apps", names.toString()).apply();
 *     call.resolve();
 *   }
 *
 *   @PluginMethod
 *   public void getBlockedApps(PluginCall call) {
 *     String stored = getContext().getSharedPreferences("dominus", Context.MODE_PRIVATE)
 *       .getString("blocked_apps", "[]");
 *     JSObject ret = new JSObject();
 *     ret.put("packageNames", stored);
 *     call.resolve(ret);
 *   }
 *
 *   private boolean hasUsagePermission() {
 *     UsageStatsManager usm = (UsageStatsManager)
 *       getContext().getSystemService(Context.USAGE_STATS_SERVICE);
 *     long now = System.currentTimeMillis();
 *     List<UsageStats> list = usm.queryUsageStats(
 *       UsageStatsManager.INTERVAL_DAILY, now - 86400000, now);
 *     return list != null && !list.isEmpty();
 *   }
 *
 *   private String getAppName(String pkg) {
 *     try {
 *       return getContext().getPackageManager()
 *         .getApplicationLabel(
 *           getContext().getPackageManager().getApplicationInfo(pkg, 0)
 *         ).toString();
 *     } catch (Exception e) { return pkg; }
 *   }
 * }
 * ```
 */
