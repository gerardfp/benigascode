package com.benigascode;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class BenigascodeApplication {

    public static void main(String[] args) {
        SpringApplication.run(BenigascodeApplication.class, args);
    }
}

