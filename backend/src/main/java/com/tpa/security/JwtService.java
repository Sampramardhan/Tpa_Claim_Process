package com.tpa.security;

import com.tpa.common.enums.UserRole;
import com.tpa.utils.DateTimeUtils;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtBuilder;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Date;
import java.util.UUID;

@Service
public class JwtService {

    private static final String USER_ID_CLAIM = "userId";
    private static final String FULL_NAME_CLAIM = "fullName";
    private static final String ROLE_CLAIM = "role";

    private final SecurityProperties securityProperties;
    private final SecretKey signingKey;

    public JwtService(SecurityProperties securityProperties) {
        this.securityProperties = securityProperties;
        this.signingKey = buildSigningKey(securityProperties.getJwt().getSecret());
    }

    public String generateToken(TpaUserPrincipal principal) {
        return generateToken(principal, getExpiresAt());
    }

    public String generateToken(TpaUserPrincipal principal, LocalDateTime expiresAt) {
        LocalDateTime now = DateTimeUtils.nowUtc();

        JwtBuilder builder = Jwts.builder()
                .issuer(securityProperties.getJwt().getIssuer())
                .subject(principal.getEmail())
                .issuedAt(Date.from(now.toInstant(ZoneOffset.UTC)))
                .expiration(Date.from(expiresAt.toInstant(ZoneOffset.UTC)))
                .claim(FULL_NAME_CLAIM, principal.getFullName())
                .claim(ROLE_CLAIM, principal.getRole().name())
                .signWith(signingKey);

        if (principal.getId() != null) {
            builder.claim(USER_ID_CLAIM, principal.getId().toString());
        }

        return builder.compact();
    }

    public TpaUserPrincipal parseToken(String token) {
        Claims claims = Jwts.parser()
                .verifyWith(signingKey)
                .requireIssuer(securityProperties.getJwt().getIssuer())
                .build()
                .parseSignedClaims(token)
                .getPayload();

        String role = claims.get(ROLE_CLAIM, String.class);
        String userId = claims.get(USER_ID_CLAIM, String.class);

        return new TpaUserPrincipal(
                userId == null || userId.isBlank() ? null : UUID.fromString(userId),
                claims.get(FULL_NAME_CLAIM, String.class),
                claims.getSubject(),
                "",
                UserRole.valueOf(role),
                true
        );
    }

    public LocalDateTime getExpiresAt() {
        return DateTimeUtils.nowUtc().plusMinutes(securityProperties.getJwt().getExpirationMinutes());
    }

    private SecretKey buildSigningKey(String secret) {
        try {
            byte[] keyBytes = MessageDigest.getInstance("SHA-256")
                    .digest(secret.getBytes(StandardCharsets.UTF_8));
            return Keys.hmacShaKeyFor(keyBytes);
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("Unable to initialize JWT signing key.", exception);
        }
    }
}
