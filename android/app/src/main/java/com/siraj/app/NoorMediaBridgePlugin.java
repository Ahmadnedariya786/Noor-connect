package com.siraj.app;

import android.content.ClipData;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.media.MediaScannerConnection;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Log;

import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;

/**
 * NoorMediaBridgePlugin: Native Android MediaStore Gallery Saver & ACTION_SEND Share Sheet Bridge.
 * Bypasses Scoped Storage barriers on Android 10+ (API 29+) via ContentResolver MediaStore insertion.
 */
@CapacitorPlugin(name = "NoorMediaBridge")
public class NoorMediaBridgePlugin extends Plugin {
    private static final String TAG = "NoorMediaBridge";

    private File resolveCacheFile(String cacheFileName) {
        if (cacheFileName == null || cacheFileName.trim().isEmpty()) {
            return null;
        }

        String cleanPath = cacheFileName.trim();
        if (cleanPath.startsWith("file://")) {
            cleanPath = cleanPath.substring(7);
        }

        Context ctx = getContext();

        // 1. Check relative to context.getCacheDir()
        File f = new File(ctx.getCacheDir(), cleanPath);
        if (f.exists() && f.length() > 0) {
            return f;
        }

        // 2. Check relative to context.getExternalCacheDir()
        if (ctx.getExternalCacheDir() != null) {
            File extF = new File(ctx.getExternalCacheDir(), cleanPath);
            if (extF.exists() && extF.length() > 0) {
                return extF;
            }
        }

        // 3. Check relative to context.getFilesDir()
        File filesF = new File(ctx.getFilesDir(), cleanPath);
        if (filesF.exists() && filesF.length() > 0) {
            return filesF;
        }

        // 4. Check absolute path
        File absF = new File(cleanPath);
        if (absF.exists() && absF.length() > 0) {
            return absF;
        }

        // Fallback: return file in cacheDir
        return f;
    }

    @PluginMethod
    public void saveToGallery(PluginCall call) {
        String cacheFileName = call.getString("cacheFileName");
        String mimeType = call.getString("mimeType", "video/mp4");
        if (mimeType != null && mimeType.contains(";")) {
            mimeType = mimeType.split(";")[0].trim();
        }
        if (mimeType == null || mimeType.isEmpty()) {
            mimeType = "video/mp4";
        }
        String displayName = call.getString("displayName");

        if (cacheFileName == null || cacheFileName.trim().isEmpty()) {
            call.reject("Missing required parameter: cacheFileName");
            return;
        }

        File srcFile = resolveCacheFile(cacheFileName);
        if (srcFile == null || !srcFile.exists() || srcFile.length() == 0) {
            call.reject("Source file does not exist or is empty in cache: " + cacheFileName);
            return;
        }

        if (displayName == null || displayName.trim().isEmpty()) {
            displayName = srcFile.getName();
        }

        boolean isVideo = mimeType != null && mimeType.startsWith("video/");
        Context ctx = getContext();

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                // Android 10+ (API 29+): Scoped Storage via MediaStore ContentResolver
                ContentResolver resolver = ctx.getContentResolver();
                Uri collectionUri = isVideo
                        ? MediaStore.Video.Media.EXTERNAL_CONTENT_URI
                        : MediaStore.Images.Media.EXTERNAL_CONTENT_URI;

                String relativePath = isVideo
                        ? Environment.DIRECTORY_MOVIES + "/NoorConnect"
                        : Environment.DIRECTORY_PICTURES + "/NoorConnect";

                ContentValues values = new ContentValues();
                values.put(MediaStore.MediaColumns.DISPLAY_NAME, displayName);
                values.put(MediaStore.MediaColumns.MIME_TYPE, mimeType);
                values.put(MediaStore.MediaColumns.RELATIVE_PATH, relativePath);
                values.put(MediaStore.MediaColumns.IS_PENDING, 1);

                Uri targetUri = resolver.insert(collectionUri, values);
                if (targetUri == null) {
                    call.reject("Failed to create MediaStore entry in " + relativePath);
                    return;
                }

                try (InputStream in = new FileInputStream(srcFile);
                     OutputStream out = resolver.openOutputStream(targetUri)) {
                    if (out == null) {
                        call.reject("Failed to open output stream for MediaStore URI");
                        return;
                    }
                    byte[] buf = new byte[8192];
                    int len;
                    while ((len = in.read(buf)) > 0) {
                        out.write(buf, 0, len);
                    }
                    out.flush();
                }

                values.clear();
                values.put(MediaStore.MediaColumns.IS_PENDING, 0);
                resolver.update(targetUri, values, null, null);

                JSObject res = new JSObject();
                res.put("saved", true);
                res.put("uri", targetUri.toString());
                res.put("folder", isVideo ? "Movies/NoorConnect" : "Pictures/NoorConnect");
                call.resolve(res);
            } else {
                // Android 9 and below: Legacy external storage public directory
                String topDir = isVideo ? Environment.DIRECTORY_MOVIES : Environment.DIRECTORY_PICTURES;
                File targetDir = new File(Environment.getExternalStoragePublicDirectory(topDir), "NoorConnect");
                if (!targetDir.exists()) {
                    targetDir.mkdirs();
                }

                File destFile = new File(targetDir, displayName);
                try (InputStream in = new FileInputStream(srcFile);
                     OutputStream out = new FileOutputStream(destFile)) {
                    byte[] buf = new byte[8192];
                    int len;
                    while ((len = in.read(buf)) > 0) {
                        out.write(buf, 0, len);
                    }
                    out.flush();
                }

                MediaScannerConnection.scanFile(ctx, new String[]{destFile.getAbsolutePath()}, new String[]{mimeType}, null);

                JSObject res = new JSObject();
                res.put("saved", true);
                res.put("uri", Uri.fromFile(destFile).toString());
                res.put("folder", isVideo ? "Movies/NoorConnect" : "Pictures/NoorConnect");
                call.resolve(res);
            }
        } catch (Exception e) {
            Log.e(TAG, "saveToGallery error", e);
            call.reject("Failed to save to Android gallery: " + e.getMessage());
        }
    }

    @PluginMethod
    public void shareCachedFile(PluginCall call) {
        String cacheFileName = call.getString("cacheFileName");
        String mimeType = call.getString("mimeType", "video/mp4");
        if (mimeType != null && mimeType.contains(";")) {
            mimeType = mimeType.split(";")[0].trim();
        }
        if (mimeType == null || mimeType.isEmpty()) {
            mimeType = "*/*";
        }
        String title = call.getString("title", "Siraj");
        String caption = call.getString("caption", "");

        if (cacheFileName == null || cacheFileName.trim().isEmpty()) {
            call.reject("Missing required parameter: cacheFileName");
            return;
        }

        File file = resolveCacheFile(cacheFileName);
        if (file == null || !file.exists() || file.length() == 0) {
            call.reject("File does not exist or is empty in cache: " + cacheFileName);
            return;
        }

        Context ctx = getContext();
        try {
            Uri contentUri = FileProvider.getUriForFile(ctx, ctx.getPackageName() + ".fileprovider", file);

            Intent intent = new Intent(Intent.ACTION_SEND);
            intent.setType(mimeType != null ? mimeType : "*/*");
            intent.putExtra(Intent.EXTRA_STREAM, contentUri);
            if (caption != null && !caption.isEmpty()) {
                intent.putExtra(Intent.EXTRA_TEXT, caption);
            }
            if (title != null && !title.isEmpty()) {
                intent.putExtra(Intent.EXTRA_SUBJECT, title);
            }
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            intent.setClipData(ClipData.newRawUri(title, contentUri));

            Intent chooser = Intent.createChooser(intent, title);
            chooser.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

            getActivity().runOnUiThread(() -> {
                try {
                    getActivity().startActivity(chooser);
                    JSObject res = new JSObject();
                    res.put("shared", true);
                    call.resolve(res);
                } catch (Exception e) {
                    Log.e(TAG, "Failed to start share chooser", e);
                    call.reject("Failed to launch share chooser: " + e.getMessage());
                }
            });
        } catch (Exception e) {
            Log.e(TAG, "shareCachedFile error", e);
            call.reject("Failed to prepare share intent: " + e.getMessage());
        }
    }
}
