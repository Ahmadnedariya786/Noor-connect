package com.noorconnect.app.widgets

import android.appwidget.AppWidgetManager
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.os.Bundle
import android.util.Log
import android.widget.ArrayAdapter
import android.widget.RadioGroup
import android.widget.SeekBar
import android.widget.Spinner
import androidx.appcompat.app.AppCompatActivity
import com.noorconnect.app.R

/**
 * Widget Configuration Activity
 *
 * Allows users to configure widget appearance before adding to home screen.
 * Supports: size selection, theme (light/dark/system), data density, accent color.
 */
class WidgetConfigureActivity : AppCompatActivity() {

    companion object {
        private const val TAG = "WidgetConfigureActivity"
        const val EXTRA_WIDGET_ID = "widget_id"
        const val EXTRA_WIDGET_TYPE = "widget_type"
    }

    private var widgetId = AppWidgetManager.INVALID_APPWIDGET_ID
    private var widgetType = ""

    private lateinit var sizeSpinner: Spinner
    private lateinit var themeRadioGroup: RadioGroup
    private lateinit var densitySeekBar: SeekBar
    private lateinit var accentColorSpinner: Spinner

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_widget_configure)

        // Get widget ID and type from intent
        widgetId = intent.getIntExtra(EXTRA_WIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID)
        widgetType = intent.getStringExtra(EXTRA_WIDGET_TYPE) ?: ""

        if (widgetId == AppWidgetManager.INVALID_APPWIDGET_ID) {
            finish()
            return
        }

        initViews()
        loadCurrentConfig()
        setupListeners()
    }

    private fun initViews() {
        sizeSpinner = findViewById(R.id.spinner_widget_size)
        themeRadioGroup = findViewById(R.id.radiogroup_theme)
        densitySeekBar = findViewById(R.id.seekbar_data_density)
        accentColorSpinner = findViewById(R.id.spinner_accent_color)

        // Setup size spinner based on widget type
        val sizeOptions = when (widgetType) {
            "tasbeeh" -> arrayOf("2×2 (Compact)")
            "nextprayer", "dailyayah", "dailyhadith", "quranprogress" -> {
                arrayOf("4×1 (Wide)", "4×2 (Standard)", "4×3 (Large)")
            }
            else -> arrayOf("4×2 (Standard)")
        }
        sizeSpinner.adapter = ArrayAdapter(this, android.R.layout.simple_spinner_item, sizeOptions).also {
            it.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item)
        }

        // Setup accent color spinner
        val colorOptions = arrayOf(
            "Emerald (Default)", "Gold", "Amber", "Blue", "Purple", "Teal", "Red"
        )
        accentColorSpinner.adapter = ArrayAdapter(this, android.R.layout.simple_spinner_item, colorOptions).also {
            it.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item)
        }
    }

    private fun loadCurrentConfig() {
        val prefs = getWidgetPrefs()

        // Load saved size
        val savedSize = prefs.getString("widget_size_$widgetId", "default") ?: "default"
        val sizeOptions = sizeSpinner.adapter as ArrayAdapter<*>
        for (i in 0 until sizeOptions.count) {
            if (sizeOptions.getItem(i).toString().startsWith(savedSize)) {
                sizeSpinner.setSelection(i)
                break
            }
        }

        // Load theme
        val savedTheme = prefs.getString("widget_theme_$widgetId", "system")
        when (savedTheme) {
            "light" -> themeRadioGroup.check(R.id.radio_light)
            "dark" -> themeRadioGroup.check(R.id.radio_dark)
            else -> themeRadioGroup.check(R.id.radio_system)
        }

        // Load data density
        val savedDensity = prefs.getInt("widget_density_$widgetId", 50)
        densitySeekBar.progress = savedDensity

        // Load accent color
        val savedColor = prefs.getString("widget_accent_$widgetId", "emerald") ?: "emerald"
        val colorOptions = accentColorSpinner.adapter as ArrayAdapter<*>
        for (i in 0 until colorOptions.count) {
            if (colorOptions.getItem(i).toString().lowercase().startsWith(savedColor.lowercase())) {
                accentColorSpinner.setSelection(i)
                break
            }
        }
    }

    private fun setupListeners() {
        findViewById<android.widget.Button>(R.id.btn_cancel).setOnClickListener {
            setResult(RESULT_CANCELED)
            finish()
        }

        findViewById<android.widget.Button>(R.id.btn_save).setOnClickListener {
            saveConfig()
        }
    }

    private fun saveConfig() {
        val prefs = getWidgetPrefs().edit()

        // Save size
        val selectedSize = sizeSpinner.selectedItem.toString()
        prefs.putString("widget_size_$widgetId", selectedSize.split(" ")[0])

        // Save theme
        val theme = when (themeRadioGroup.checkedRadioButtonId) {
            R.id.radio_light -> "light"
            R.id.radio_dark -> "dark"
            else -> "system"
        }
        prefs.putString("widget_theme_$widgetId", theme)

        // Save data density
        prefs.putInt("widget_density_$widgetId", densitySeekBar.progress)

        // Save accent color
        val selectedColor = accentColorSpinner.selectedItem.toString().split(" ")[0].lowercase()
        prefs.putString("widget_accent_$widgetId", selectedColor)

        prefs.apply()

        // Trigger widget refresh with new config
        WidgetRefreshWorker.enqueueImmediate(this)

        // Return result
        val result = Intent().putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId)
        setResult(RESULT_OK, result)
        finish()
    }

    private fun getWidgetPrefs(): SharedPreferences =
        getSharedPreferences("WidgetConfigPrefs", Context.MODE_PRIVATE)
}