package com.tpa;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class TpaClaimProcessApplication {

    public static void main(String[] args) {
        SpringApplication.run(TpaClaimProcessApplication.class, args);
    }
}
