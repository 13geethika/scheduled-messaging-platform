package com.enterprise.scheduler.media;

import com.enterprise.scheduler.media.FileStorageService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.UUID;

@Service
@ConditionalOnProperty(name = "app.storage.type", havingValue = "s3")
public class S3StorageServiceImpl implements FileStorageService {

    private final S3Client s3Client;
    private final String bucketName;
    private final String region;

    private static final long MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB limit

    public S3StorageServiceImpl(S3Client s3Client,
                               @Value("${app.aws.s3.bucket-name}") String bucketName,
                               @Value("${app.aws.region}") String region) {
        this.s3Client = s3Client;
        this.bucketName = bucketName;
        this.region = region;
    }

    @Override
    public String storeFile(MultipartFile file) {
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new IllegalArgumentException("File size exceeds the maximum limit of 10MB");
        }

        String originalFilename = file.getOriginalFilename();
        String extension = "";
        if (originalFilename != null && originalFilename.contains(".")) {
            extension = originalFilename.substring(originalFilename.lastIndexOf("."));
        }
        
        String cleanExtension = extension.startsWith(".") ? extension.substring(1) : extension;
        String baseName = UUID.randomUUID().toString();
        String fileName = baseName + extension;

        try {
            byte[] fileBytes = file.getBytes();
            String contentType = file.getContentType();

            // Validate image and generate thumbnail
            if (contentType != null && contentType.startsWith("image/")) {
                if (ImageUtils.isSupportedByImageIO(contentType)) {
                    try (ByteArrayInputStream bais = new ByteArrayInputStream(fileBytes)) {
                        if (!ImageUtils.isValidImage(bais)) {
                            System.err.println("Warning: ImageIO could not validate image file payload. Proceeding.");
                        }
                    }
                }
                
                try {
                    byte[] thumbBytes = ImageUtils.generateThumbnail(fileBytes, cleanExtension);
                    String thumbKey = baseName + "_thumb" + extension;
                    
                    PutObjectRequest thumbPutRequest = PutObjectRequest.builder()
                            .bucket(bucketName)
                            .key(thumbKey)
                            .contentType(contentType)
                            .build();

                    s3Client.putObject(thumbPutRequest, RequestBody.fromBytes(thumbBytes));
                } catch (Exception e) {
                    System.err.println("Failed to upload thumbnail to S3: " + e.getMessage());
                }
            }

            PutObjectRequest putObjectRequest = PutObjectRequest.builder()
                    .bucket(bucketName)
                    .key(fileName)
                    .contentType(contentType)
                    .build();

            s3Client.putObject(putObjectRequest, RequestBody.fromBytes(fileBytes));

            return String.format("https://%s.s3.%s.amazonaws.com/%s", bucketName, region, fileName);
        } catch (IOException e) {
            throw new RuntimeException("Failed to upload file to S3", e);
        }
    }

    @Override
    public void deleteFile(String fileUrl) {
        if (fileUrl == null || fileUrl.isEmpty()) {
            return;
        }

        try {
            String key = fileUrl.substring(fileUrl.lastIndexOf("/") + 1);
            
            // Delete main file
            s3Client.deleteObject(DeleteObjectRequest.builder()
                    .bucket(bucketName)
                    .key(key)
                    .build());

            // Delete thumbnail if it exists
            int dotIndex = key.lastIndexOf('.');
            if (dotIndex > 0) {
                String baseName = key.substring(0, dotIndex);
                String extension = key.substring(dotIndex);
                String thumbKey = baseName + "_thumb" + extension;
                
                s3Client.deleteObject(DeleteObjectRequest.builder()
                        .bucket(bucketName)
                        .key(thumbKey)
                        .build());
            }
        } catch (Exception e) {
            throw new RuntimeException("Failed to delete file from S3: " + fileUrl, e);
        }
    }
}
