FROM eclipse-temurin:21-jdk-alpine
ARG SERVICE_PATH
WORKDIR /app
COPY ${SERVICE_PATH}/build/libs/*.jar app.jar
ENTRYPOINT ["java", "-jar", "app.jar"]