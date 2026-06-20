package com.enterprise.scheduler.media;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import com.enterprise.scheduler.media.FileStorageService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.Map;
import java.util.UUID;

@Service
@ConditionalOnProperty(name = "app.storage.type", havingValue = "cloudinary")
public class CloudinaryStorageServiceImpl implements FileStorageService {

    private final Cloudinary cloudinary;

    private static final long MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB limit

    public CloudinaryStorageServiceImpl(@Value("${app.cloudinary.url}") String cloudinaryUrl) {
        this.cloudinary = new Cloudinary(cloudinaryUrl);
    }

    @Override
    public String storeFile(MultipartFile file) {
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new IllegalArgumentException("File size exceeds the maximum limit of 10MB");
        }

        try {
            byte[] fileBytes = file.getBytes();
            String contentType = file.getContentType();

            // Validate image structure if contentType is an image
            if (contentType != null && contentType.startsWith("image/")) {
                try (ByteArrayInputStream bais = new ByteArrayInputStream(fileBytes)) {
                    if (!ImageUtils.isValidImage(bais)) {
                        throw new IllegalArgumentException("Invalid image file payload");
                    }
                }
            }

            Map<?, ?> uploadResult = cloudinary.uploader().upload(fileBytes, ObjectUtils.asMap(
                    "public_id", UUID.randomUUID().toString(),
                    "resource_type", "auto"
            ));

            return (String) uploadResult.get("secure_url");
        } catch (IOException e) {
            throw new RuntimeException("Failed to upload file to Cloudinary", e);
        }
    }

    @Override
    public void deleteFile(String fileUrl) {
        if (fileUrl == null || fileUrl.isEmpty()) {
            return;
        }

        try {
            String publicId = extractPublicId(fileUrl);
            cloudinary.uploader().destroy(publicId, ObjectUtils.emptyMap());
        } catch (Exception e) {
            throw new RuntimeException("Failed to delete file from Cloudinary: " + fileUrl, e);
        }
    }

    private String extractPublicId(String url) {
        int lastSlash = url.lastIndexOf('/');
        int lastDot = url.lastIndexOf('.');
        if (lastSlash > 0) {
            if (lastDot > lastSlash) {
                return url.substring(lastSlash + 1, lastDot);
            } else {
                return url.substring(lastSlash + 1);
            }
        }
        return url;
    }
}
