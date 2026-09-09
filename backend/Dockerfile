# Multi-stage build for CodeLab Backend (ARM64 & x86_64 compatible)
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
RUN addgroup -S codelab && adduser -S codelab -G codelab

# Instalar curl para Docker healthcheck
RUN apk add --no-cache curl

# Directorio de artefactos de contenido inmutables
RUN mkdir -p /var/lib/codelab/content && chown -R codelab:codelab /var/lib/codelab

COPY --from=builder /app/target/codelab-backend-*.jar app.jar
RUN chown -R codelab:codelab /app

USER codelab:codelab
EXPOSE 8080

ENTRYPOINT ["java", "-XX:+UseContainerSupport", "-XX:MaxRAMPercentage=75.0", "-jar", "app.jar"]

