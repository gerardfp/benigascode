package com.codelab;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class CodeLabApplication {

    public static void main(String[] args) {
        SpringApplication.run(CodeLabApplication.class, args);
    }
}

