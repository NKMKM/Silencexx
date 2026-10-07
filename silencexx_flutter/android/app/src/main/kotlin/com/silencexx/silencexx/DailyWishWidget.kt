package com.silencexx.silencexx

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.widget.RemoteViews
import androidx.work.*
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.text.SimpleDateFormat
import java.util.*
import java.util.concurrent.TimeUnit

class DailyWishWidget : AppWidgetProvider() {
    override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) {
        render(context)
        schedule(context)
    }
    override fun onDisabled(context: Context) {
        WorkManager.getInstance(context).cancelUniqueWork("daily-wish-periodic")
        WorkManager.getInstance(context).cancelUniqueWork("daily-wish-now")
    }
    companion object {
        private val lock = Any()
        fun prefs(context: Context) = context.getSharedPreferences("daily_wish", Context.MODE_PRIVATE)
        fun day() = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date())
        fun sync(context: Context, token: String?, language: String, baseUrl: String) {
            synchronized(lock) {
                val p = prefs(context)
                if (p.getString("token", null) == token && p.getString("language", "ru") == language && p.getString("baseUrl", "") == baseUrl) {
                    if (token != null && p.getString("day", "") != day()) schedule(context)
                    return
                }
                p.edit().clear().putString("token", token).putString("language", language).putString("baseUrl", baseUrl).commit()
                render(context)
                if (token == null) {
                    WorkManager.getInstance(context).cancelUniqueWork("daily-wish-now")
                    WorkManager.getInstance(context).cancelUniqueWork("daily-wish-periodic")
                } else schedule(context)
            }
        }
        fun render(context: Context) {
            val p = prefs(context)
            val ru = p.getString("language", "ru") == "ru"
            val signedIn = p.getString("token", null) != null
            val text = if (!signedIn) {
                if (ru) "Открой CloudMind и войди в аккаунт" else "Open CloudMind and sign in"
            } else if (p.getString("day", "") == day()) {
                p.getString("wish", "") ?: ""
            } else {
                if (ru) "Готовим новое пожелание. Открой приложение, если оно не появляется." else "Preparing a new wish. Open the app if it does not appear."
            }
            val views = RemoteViews(context.packageName, R.layout.daily_wish_widget)
            views.setTextViewText(R.id.wish_title, if (ru) "Пожелание на день" else "A wish for today")
            views.setTextViewText(R.id.wish_text, text)
            context.packageManager.getLaunchIntentForPackage(context.packageName)?.let {
                views.setOnClickPendingIntent(R.id.wish_root, PendingIntent.getActivity(context, 0, it, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE))
            }
            AppWidgetManager.getInstance(context).updateAppWidget(ComponentName(context, DailyWishWidget::class.java), views)
        }
        fun schedule(context: Context) {
            val ids = AppWidgetManager.getInstance(context).getAppWidgetIds(ComponentName(context, DailyWishWidget::class.java))
            if (ids.isEmpty() || prefs(context).getString("token", null) == null) return
            val constraints = Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build()
            val work = WorkManager.getInstance(context)
            work.enqueueUniquePeriodicWork("daily-wish-periodic", ExistingPeriodicWorkPolicy.KEEP,
                PeriodicWorkRequestBuilder<DailyWishWorker>(1, TimeUnit.HOURS).setConstraints(constraints).build())
            work.enqueueUniqueWork("daily-wish-now", ExistingWorkPolicy.REPLACE,
                OneTimeWorkRequestBuilder<DailyWishWorker>().setConstraints(constraints).build())
        }
        fun invalidate(context: Context, token: String, language: String, base: String) = synchronized(lock) {
            if (prefs(context).getString("token", null) == token) sync(context, null, language, base)
        }
        fun save(context: Context, token: String, language: String, base: String, wish: String, day: String): Boolean = synchronized(lock) {
            val p = prefs(context)
            if (p.getString("token", null) != token || p.getString("language", "ru") != language || p.getString("baseUrl", "") != base) return@synchronized false
            p.edit().putString("wish", wish).putString("day", day).commit()
            render(context)
            true
        }
    }
}

class DailyWishWorker(context: Context, params: WorkerParameters) : Worker(context, params) {
    override fun doWork(): Result {
        val p = DailyWishWidget.prefs(applicationContext)
        val token = p.getString("token", null) ?: return Result.success()
        val language = p.getString("language", "ru") ?: "ru"
        val base = p.getString("baseUrl", "") ?: ""
        DailyWishWidget.render(applicationContext)
        if (p.getString("day", "") == DailyWishWidget.day()) return Result.success()
        var connection: HttpURLConnection? = null
        return try {
            val offset = TimeZone.getDefault().getOffset(System.currentTimeMillis()) / 60000
            connection = URL("$base/daily-wish?language=$language&offset=$offset").openConnection() as HttpURLConnection
            connection.connectTimeout = 15000
            connection.readTimeout = 180000
            connection.setRequestProperty("Authorization", "Bearer $token")
            connection.setRequestProperty("ngrok-skip-browser-warning", "true")
            if (connection.responseCode == 401) {
                // Do not clear a newer account if an old request finishes after sign-in.
                DailyWishWidget.invalidate(applicationContext, token, language, base)
                return Result.success()
            }
            if (connection.responseCode != 200) return Result.retry()
            val data = JSONObject(connection.inputStream.bufferedReader().use { it.readText() })
            val wish = data.getString("wish")
            if (wish.isBlank() || data.getString("language") != language) return Result.retry()
            DailyWishWidget.save(applicationContext, token, language, base, wish, data.getString("day"))
            Result.success()
        } catch (_: Exception) { Result.retry() }
        finally { connection?.disconnect() }
    }
}
