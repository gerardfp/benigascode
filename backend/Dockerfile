# Multi-stage build for Benigascode Backend (ARM64 & x86_64 compatible)
FROM maven:3.9.9-eclipse-temurin-21-alpine AS builder
WORKDIR /app

# Cache dependencies
COPY pom.xml .
RUN mvn dependency:go-offline -B || true

# Build application JAR
COPY src ./src
RUN mvn clean package -DskipTests -B

# Runtime stage
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Crear usuario y grupo sin privilegios
RUN addgroup -S benigascode && adduser -S benigascode -G benigascode

# Instalar curl, git y openssh-client (preparado también para Fase 2)
RUN apk add --no-cache curl git openssh-client

# Directorios de artefactos y repositorios
RUN mkdir -p /var/lib/benigascode/content /var/lib/benigascode/repos && chown -R benigascode:benigascode /var/lib/benigascode

COPY --from=builder /app/target/benigascode-backend-*.jar app.jar
RUN chown -R benigascode:benigascode /app

USER benigascode:benigascode
EXPOSE 8080

ENTRYPOINT ["java", "-XX:+UseContainerSupport", "-XX:MaxRAMPercentage=75.0", "-jar", "app.jar"]

