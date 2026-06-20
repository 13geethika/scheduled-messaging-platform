package com.enterprise.scheduler.media;

import java.awt.Graphics2D;
import java.awt.Image;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import javax.imageio.ImageIO;

public class ImageUtils {

    public static boolean isValidImage(InputStream inputStream) {
        try {
            BufferedImage image = ImageIO.read(inputStream);
            return image != null;
        } catch (IOException e) {
            return false;
        }
    }

    /**
     * Generates a thumbnail image from the provided input stream.
     * Maintain aspect ratio up to 150x150 max.
     */
    public static byte[] generateThumbnail(byte[] imageBytes, String format) throws IOException {
        try (InputStream is = new ByteArrayInputStream(imageBytes)) {
            BufferedImage originalImage = ImageIO.read(is);
            if (originalImage == null) {
                throw new IllegalArgumentException("Invalid image file structure");
            }

            int originalWidth = originalImage.getWidth();
            int originalHeight = originalImage.getHeight();
            
            int targetWidth = 150;
            int targetHeight = 150;

            if (originalWidth > originalHeight) {
                targetHeight = (int) (targetWidth * ((double) originalHeight / originalWidth));
            } else {
                targetWidth = (int) (targetHeight * ((double) originalWidth / originalHeight));
            }

            // Ensure dimensions are at least 1x1
            targetWidth = Math.max(1, targetWidth);
            targetHeight = Math.max(1, targetHeight);

            Image resultingImage = originalImage.getScaledInstance(targetWidth, targetHeight, Image.SCALE_SMOOTH);
            BufferedImage outputImage = new BufferedImage(targetWidth, targetHeight, BufferedImage.TYPE_INT_RGB);

            Graphics2D graphics2D = outputImage.createGraphics();
            graphics2D.drawImage(resultingImage, 0, 0, null);
            graphics2D.dispose();

            try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
                String cleanFormat = format != null && !format.isEmpty() ? format : "jpg";
                ImageIO.write(outputImage, cleanFormat, baos);
                return baos.toByteArray();
            }
        }
    }
}
