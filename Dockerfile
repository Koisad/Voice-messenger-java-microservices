FROM gradle:8.5-jdk21 AS builder
WORKDIR /app

COPY settings.gradle.kts build.gradle.kts gradlew ./
COPY gradle ./gradle
COPY common ./common

ARG SERVICE_PATH
COPY ${SERVICE_PATH} ./${SERVICE_PATH}

RUN ./gradlew :${SERVICE_PATH//\//:}:bootJar --no-daemon


FROM eclipse-temurin:21-jdk-alpine
WORKDIR /app
ARG SERVICE_PATH
COPY --from=builder /app/${SERVICE_PATH}/build/libs/*.jar app.jar
ENTRYPOINT ["java", "-jar", "app.jar"]