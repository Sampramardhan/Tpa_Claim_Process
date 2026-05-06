package com.tpa.security;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@ConfigurationProperties(prefix = "tpa.security")
public class SecurityProperties {

    private Jwt jwt = new Jwt();
    private Cors cors = new Cors();
    private StaticLogins staticLogins = new StaticLogins();

    @Getter
    @Setter
    public static class Jwt {
        private String secret;
        private String issuer;
        private long expirationMinutes = 120;
    }

    @Getter
    @Setter
    public static class Cors {
        private List<String> allowedOrigins = new ArrayList<>();
    }

    @Getter
    @Setter
    public static class StaticLogins {
        private RoleCredential client = new RoleCredential();
        private RoleCredential fmg = new RoleCredential();
        private RoleCredential carrier = new RoleCredential();
    }

    @Getter
    @Setter
    public static class RoleCredential {
        private String email;
        private String password;
        private String passwordHash;
    }
}
