# Multi-stage build: compile with the full Maven/JDK image, ship a lean JRE.

FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /build

# Pre-fetch dependencies so subsequent source-only rebuilds hit the cache.
COPY pom.xml .
RUN mvn dependency:go-offline -B

COPY src ./src
RUN mvn package -DskipTests -B

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /build/target/*.jar app.jar

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
