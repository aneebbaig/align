package com.anhib.align

import android.content.ComponentName
import android.content.Intent
import android.content.pm.ShortcutInfo
import android.content.pm.ShortcutManager
import android.graphics.drawable.Icon
import android.net.Uri
import android.os.Build
import android.os.Bundle
import io.flutter.embedding.android.FlutterActivity

class MainActivity : FlutterActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        registerQuickAddShortcut()
    }

    // Registered dynamically instead of via res/xml/shortcuts.xml: a static
    // shortcut's targetPackage/targetClass are plain strings with no access
    // to applicationId, so a rebranded build (different applicationId, same
    // source package) would point the shortcut at a package that doesn't
    // exist on the device. Building the ComponentName from this activity's
    // own class always resolves to whatever applicationId actually built it.
    private fun registerQuickAddShortcut() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.N_MR1) return
        val shortcutManager = getSystemService(ShortcutManager::class.java) ?: return

        val intent = Intent(Intent.ACTION_VIEW, Uri.parse("align://quick-add")).apply {
            component = ComponentName(this@MainActivity, MainActivity::class.java)
        }
        val shortcut = ShortcutInfo.Builder(this, "quick_add_expense")
            .setShortLabel(getString(R.string.shortcut_add_short))
            .setLongLabel(getString(R.string.shortcut_add_long))
            .setIcon(Icon.createWithResource(this, R.drawable.shortcut_add_expense))
            .setIntent(intent)
            .build()
        shortcutManager.dynamicShortcuts = listOf(shortcut)
    }
}
