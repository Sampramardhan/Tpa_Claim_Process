package com.tpa.claims.service;

import com.tpa.claims.dto.StoredClaimFile;
import com.tpa.claims.enums.ClaimDocumentType;
import com.tpa.config.StorageProperties;
import com.tpa.exception.FileStorageException;
import com.tpa.exception.ValidationException;
import com.tpa.utils.DateTimeUtils;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.InvalidPathException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Comparator;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Stream;

@Service
public class ClaimFileStorageService {

    private static final Set<String> ALLOWED_EXTENSIONS = Set.of("pdf", "jpg", "jpeg", "png");
    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
            "application/pdf",
            "image/jpeg",
            "image/png"
    );

    private final Path uploadRoot;

    public ClaimFileStorageService(StorageProperties storageProperties) {
        this.uploadRoot = Paths.get(storageProperties.getUploadDir()).toAbsolutePath().normalize();
    }

    public StoredClaimFile storeClaimDocument(
            String claimNumber,
            ClaimDocumentType documentType,
            MultipartFile file
    ) {
        validateFile(file, documentType);

        String originalFileName = StringUtils.cleanPath(file.getOriginalFilename() == null ? "" : file.getOriginalFilename());
        String extension = resolveExtension(originalFileName);
        String storedFileName = buildStoredFileName(documentType, extension);

        Path claimDirectory = uploadRoot.resolve("claims").resolve(claimNumber).normalize();
        Path targetFile = claimDirectory.resolve(storedFileName).normalize();

        if (!targetFile.startsWith(claimDirectory)) {
            throw new FileStorageException("Invalid target file path generated for claim upload.");
        }

        try {
            Files.createDirectories(claimDirectory);
            file.transferTo(targetFile);
        } catch (IOException | IllegalStateException exception) {
            throw new FileStorageException("Unable to store uploaded claim document.", exception.getMessage());
        }

        String relativePath = uploadRoot.relativize(targetFile).toString().replace('\\', '/');
        return new StoredClaimFile(
                documentType,
                originalFileName,
                storedFileName,
                relativePath,
                DateTimeUtils.nowUtc()
        );
    }

    public void deleteClaimFiles(String claimNumber) {
        Path claimDirectory = uploadRoot.resolve("claims").resolve(claimNumber).normalize();
        if (!claimDirectory.startsWith(uploadRoot.resolve("claims").normalize())) {
            throw new FileStorageException("Refusing to delete files outside the claims upload directory.");
        }

        if (!Files.exists(claimDirectory)) {
            return;
        }

        try (Stream<Path> files = Files.walk(claimDirectory)) {
            files.sorted(Comparator.reverseOrder())
                    .forEach(path -> {
                        try {
                            Files.deleteIfExists(path);
                        } catch (IOException exception) {
                            throw new FileStorageException(
                                    "Unable to clean up stored claim files.",
                                    Map.of("path", path.toString(), "reason", exception.getMessage())
                            );
                        }
                    });
        } catch (IOException exception) {
            throw new FileStorageException("Unable to clean up stored claim files.", exception.getMessage());
        }
    }

    public byte[] readStoredFile(String storedFilePath) {
        Path resolvedPath = resolveStoredFilePath(storedFilePath);
        try {
            return Files.readAllBytes(resolvedPath);
        } catch (IOException exception) {
            throw new FileStorageException("Unable to read stored claim document.", exception.getMessage());
        }
    }

    public String resolveMimeType(String fileName) {
        String extension = resolveExtension(fileName);
        return switch (extension) {
            case "pdf" -> "application/pdf";
            case "jpg", "jpeg" -> "image/jpeg";
            case "png" -> "image/png";
            default -> throw new ValidationException("Unsupported stored file type: " + extension);
        };
    }

    private Path resolveStoredFilePath(String storedFilePath) {
        try {
            Path resolvedPath = uploadRoot.resolve(storedFilePath).normalize();
            if (!resolvedPath.startsWith(uploadRoot)) {
                throw new FileStorageException("Stored file path resolved outside the configured upload directory.");
            }
            return resolvedPath;
        } catch (InvalidPathException exception) {
            throw new FileStorageException("Stored file path is invalid.", exception.getMessage());
        }
    }

    private void validateFile(MultipartFile file, ClaimDocumentType documentType) {
        String fieldLabel = switch (documentType) {
            case CLAIM_FORM -> "Claim form";
            case HOSPITAL_DOCUMENT -> "Combined hospital document";
        };

        if (file == null || file.isEmpty()) {
            throw new ValidationException(fieldLabel + " is required.");
        }

        String originalFileName = StringUtils.cleanPath(file.getOriginalFilename() == null ? "" : file.getOriginalFilename());
        String extension = resolveExtension(originalFileName);

        if (!ALLOWED_EXTENSIONS.contains(extension)) {
            throw new ValidationException(
                    fieldLabel + " must be a PDF, JPG, JPEG, or PNG file.",
                    Map.of("documentType", documentType.name(), "fileName", originalFileName)
            );
        }

        String contentType = file.getContentType();
        if (StringUtils.hasText(contentType) && !ALLOWED_CONTENT_TYPES.contains(contentType.toLowerCase(Locale.ROOT))) {
            throw new ValidationException(
                    fieldLabel + " has an unsupported file type.",
                    Map.of("documentType", documentType.name(), "contentType", contentType)
            );
        }
    }

    private String resolveExtension(String originalFileName) {
        String extension = StringUtils.getFilenameExtension(originalFileName);
        if (!StringUtils.hasText(extension)) {
            throw new ValidationException("Uploaded file must include a supported file extension.");
        }
        return extension.toLowerCase(Locale.ROOT);
    }

    private String buildStoredFileName(ClaimDocumentType documentType, String extension) {
        return documentType.name().toLowerCase(Locale.ROOT) + "-" + UUID.randomUUID() + "." + extension;
    }
}
