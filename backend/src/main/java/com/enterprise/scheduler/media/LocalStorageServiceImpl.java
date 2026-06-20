package com.enterprise.scheduler.media;

import com.enterprise.scheduler.media.FileStorageService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Objects;
import java.util.UUID;

@Service
@ConditionalOnProperty(name = "app.storage.type", havingValue = "local", matchIfMissing = true)
public class LocalStorageServiceImpl implements FileStorageService {

    private final Path fileStorageLocation;
    private final String serverUrl;

    // Enforce 10MB limit
    private static final long MAX_FILE_SIZE = 10 * 1024 * 1024;

    public LocalStorageServiceImpl(
            @Value("${app.storage.local-dir:uploads}") String uploadDir,
            @Value("${app.server.url:http://localhost:8080}") String serverUrl) {
        
        this.fileStorageLocation = Paths.get(uploadDir).toAbsolutePath().normalize();
        this.serverUrl = serverUrl;

        try {
            Files.createDirectories(this.fileStorageLocation);
        } catch (Exception ex) {
            throw new RuntimeException("Could not create the directory where the uploaded files will be stored.", ex);
        }
    }

    @Override
    public String storeFile(MultipartFile file) {
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new IllegalArgumentException("File size exceeds the maximum limit of 10MB");
        }

        String originalFileName = StringUtils.cleanPath(Objects.requireNonNull(file.getOriginalFilename()));
        String fileExtension = "";
        
        int dotIndex = originalFileName.lastIndexOf('.');
        if (dotIndex > 0) {
            fileExtension = originalFileName.substring(dotIndex);
        }
        
        String cleanExtension = fileExtension.startsWith(".") ? fileExtension.substring(1) : fileExtension;
        String baseName = UUID.randomUUID().toString();
        String fileName = baseName + fileExtension;

        try {
            if (fileName.contains("..")) {
                throw new RuntimeException("Filename contains invalid path sequence " + fileName);
            }

            byte[] fileBytes = file.getBytes();
            String contentType = file.getContentType();

            // Image validation and thumbnailing
            if (contentType != null && contentType.startsWith("image/")) {
                try (ByteArrayInputStream bais = new ByteArrayInputStream(fileBytes)) {
                    if (!ImageUtils.isValidImage(bais)) {
                        throw new IllegalArgumentException("Invalid image file payload");
                    }
                }
                
                try {
                    byte[] thumbBytes = ImageUtils.generateThumbnail(fileBytes, cleanExtension);
                    Path thumbPath = this.fileStorageLocation.resolve(baseName + "_thumb" + fileExtension);
                    Files.write(thumbPath, thumbBytes);
                } catch (Exception e) {
                    // Log or handle thumbnail failure gracefully, still allow original save
                    System.err.println("Failed to generate thumbnail: " + e.getMessage());
                }
            }

            Path targetLocation = this.fileStorageLocation.resolve(fileName);
            Files.copy(new ByteArrayInputStream(fileBytes), targetLocation, StandardCopyOption.REPLACE_EXISTING);

            return this.serverUrl + "/uploads/" + fileName;
        } catch (IOException ex) {
            throw new RuntimeException("Could not store file " + fileName + ". Please try again!", ex);
        }
    }

    @Override
    public void deleteFile(String fileUrl) {
        if (fileUrl == null || fileUrl.isEmpty()) {
            return;
        }
        
        try {
            String fileName = fileUrl.substring(fileUrl.lastIndexOf("/") + 1);
            Path filePath = this.fileStorageLocation.resolve(fileName);
            Files.deleteIfExists(filePath);

            // Also attempt to delete thumbnail
            int dotIndex = fileName.lastIndexOf('.');
            if (dotIndex > 0) {
                String baseName = fileName.substring(0, dotIndex);
                String extension = fileName.substring(dotIndex);
                Path thumbPath = this.fileStorageLocation.resolve(baseName + "_thumb" + extension);
                Files.deleteIfExists(thumbPath);
            }
        } catch (IOException e) {
            throw new RuntimeException("Failed to delete local file: " + fileUrl, e);
        }
    }
}
