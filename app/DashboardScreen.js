import React, { useState, useEffect } from "react";
import { StyleSheet, View, Text, Pressable } from "react-native";
import * as Location from "expo-location";
import { Accelerometer } from "expo-sensors";
import haversine from "haversine";
import AsyncStorage from "@react-native-async-storage/async-storage";

class DrivingDataCollector {
    constructor() {
        this.locationSubscription = null;
        this.accelerometerSubscription = null;
        this.previousLocation = null;
        this.previousSpeed = 0;
        this.previousTimestamp = null;
        this.drivingData = {
            speeds: [],
            accelerations: [],
            coordinates: [],
            timestamps: [],
            distance: 0,
            idleTime: 0,
            lastIdleCheck: null,
            isIdle: false,
            harshAccelerations: 0,
            harshBraking: 0,
        };
    }

    async initialize() {
        try {
            const { status } =
                await Location.requestForegroundPermissionsAsync();
            if (status !== "granted") {
                throw new Error("Location permission denied");
            }
            await Location.enableNetworkProviderAsync();
            this.startTracking();
        } catch (error) {
            console.error("Error initializing:", error);
            throw error;
        }
    }

    async startTracking() {
        const locationOptions = {
            accuracy: Location.Accuracy.BestForNavigation,
            timeInterval: 1000,
            distanceInterval: 1,
        };

        this.locationSubscription = await Location.watchPositionAsync(
            locationOptions,
            this.handleLocationUpdate,
        );

        Accelerometer.setUpdateInterval(100);
        this.accelerometerSubscription = Accelerometer.addListener(
            this.handleAccelerometerUpdate,
        );
    }

    handleLocationUpdate = (location) => {
        const { latitude, longitude, speed, timestamp } = location.coords;
        const currentTimestamp = timestamp || Date.now();

        this.drivingData.coordinates.push({ latitude, longitude });
        this.drivingData.timestamps.push(currentTimestamp);

        let currentSpeed = speed;
        if (!speed && this.previousLocation) {
            const distance = this.calculateDistance(this.previousLocation, {
                latitude,
                longitude,
            });
            const timeDiff = (currentTimestamp - this.previousTimestamp) / 1000;
            currentSpeed = distance / timeDiff;
        }

        currentSpeed = currentSpeed * 3.6; // Convert to km/h
        this.drivingData.speeds.push(currentSpeed);

        // Calculate acceleration and check for harsh events
        if (this.previousSpeed !== null && this.previousTimestamp !== null) {
            const timeDiff = (currentTimestamp - this.previousTimestamp) / 1000;
            const acceleration = (currentSpeed - this.previousSpeed) / timeDiff;
            this.drivingData.accelerations.push(acceleration);

            // Check for harsh acceleration/braking
            if (acceleration > 3.5) {
                // More than 3.5 m/s² is considered harsh acceleration
                this.drivingData.harshAccelerations++;
            } else if (acceleration < -3.5) {
                // Less than -3.5 m/s² is considered harsh braking
                this.drivingData.harshBraking++;
            }
        }

        if (this.previousLocation) {
            const segmentDistance = this.calculateDistance(
                this.previousLocation,
                { latitude, longitude },
            );
            this.drivingData.distance += segmentDistance;
        }

        this.updateIdleTime(currentSpeed, currentTimestamp);

        this.previousLocation = { latitude, longitude };
        this.previousSpeed = currentSpeed;
        this.previousTimestamp = currentTimestamp;
    };

    handleAccelerometerUpdate = (accelerometerData) => {
        const { x, y, z } = accelerometerData;
        const accelerationMagnitude = Math.sqrt(x * x + y * y + z * z);
        // this.drivingData.accelerations.push(accelerationMagnitude);
    };

    calculateDistance(start, end) {
        return haversine(start, end, { unit: "meter" });
    }

    updateIdleTime(currentSpeed, currentTimestamp) {
        const IDLE_SPEED_THRESHOLD = 3;

        if (currentSpeed < IDLE_SPEED_THRESHOLD) {
            if (!this.drivingData.isIdle) {
                this.drivingData.isIdle = true;
                this.drivingData.lastIdleCheck = currentTimestamp;
            } else if (this.drivingData.lastIdleCheck) {
                const idleDuration =
                    (currentTimestamp - this.drivingData.lastIdleCheck) / 1000;
                this.drivingData.idleTime += idleDuration;
                this.drivingData.lastIdleCheck = currentTimestamp;
            }
        } else {
            this.drivingData.isIdle = false;
            this.drivingData.lastIdleCheck = null;
        }
    }

    calculateEcoScore() {
        const {
            speeds,
            accelerations,
            idleTime,
            harshAccelerations,
            harshBraking,
            distance,
        } = this.drivingData;

        // Calculate various factors
        const avgSpeed = speeds.reduce((a, b) => a + b, 0) / speeds.length;
        const avgAcceleration = Math.abs(
            accelerations.reduce((a, b) => a + b, 0) / accelerations.length,
        );

        // Penalties
        const idleTimePenalty = Math.min(idleTime / 300, 0.3); // Max 30% penalty for idle time
        const harshEventsPenalty = Math.min(
            (harshAccelerations + harshBraking) * 0.05,
            0.3,
        ); // 5% per harsh event, max 30%

        // Base score calculation
        let ecoScore = 1.0;

        // Reduce score based on penalties
        ecoScore -= idleTimePenalty;
        ecoScore -= harshEventsPenalty;

        // Ensure score is between 0 and 1
        return Math.max(0, Math.min(1, ecoScore));
    }

    getDrivingMetrics() {
        const { speeds, accelerations, distance, idleTime } = this.drivingData;

        return {
            currentSpeed: speeds[speeds.length - 1] || 0,
            averageSpeed:
                speeds.reduce((a, b) => a + b, 0) / speeds.length || 0,
            maxSpeed: Math.max(...speeds, 0),
            distance: distance,
            idleTime: idleTime,
            acceleration: accelerations[accelerations.length - 1] || 0,
            averageAcceleration:
                accelerations.reduce((a, b) => a + b, 0) /
                    accelerations.length || 0,
            ecoScore: this.calculateEcoScore(),
            harshAccelerations: this.drivingData.harshAccelerations,
            harshBraking: this.drivingData.harshBraking,
        };
    }

    stopTracking() {
        if (this.locationSubscription) {
            this.locationSubscription.remove();
        }
        if (this.accelerometerSubscription) {
            this.accelerometerSubscription.remove();
        }
    }
}

export default function DashboardScreen({ navigation }) {
    const [metrics, setMetrics] = useState(null);
    const [collector, setCollector] = useState(null);
    const [isTracking, setIsTracking] = useState(true);

    useEffect(() => {
        const initializeCollector = async () => {
            const newCollector = new DrivingDataCollector();
            await newCollector.initialize();
            setCollector(newCollector);

            const metricsInterval = setInterval(() => {
                const currentMetrics = newCollector.getDrivingMetrics();
                setMetrics(currentMetrics);
            }, 1000);

            return () => {
                clearInterval(metricsInterval);
                newCollector.stopTracking();
            };
        };

        initializeCollector();
    }, []);

    const stopDriving = async () => {
        if (collector) {
            collector.stopTracking();
            console.log("stopped tracking");
            setIsTracking(false);

            const historyData = {
                date: new Date().toISOString(),
                metrics: metrics,
            };

            try {
                const existingHistory =
                    await AsyncStorage.getItem("drivingHistory");
                const history = existingHistory
                    ? JSON.parse(existingHistory)
                    : [];
                // console.log(historyData);
                history.push(historyData);
                await AsyncStorage.setItem(
                    "drivingHistory",
                    JSON.stringify(history),
                );
            } catch (error) {
                console.error("Error saving history:", error);
            }

            navigation.navigate("History");
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerText}>Live Driving Metrics</Text>
            </View>

            {metrics && (
                <View style={styles.metricsContainer}>
                    <View style={styles.scoreCard}>
                        <Text style={styles.scoreTitle}>Overall Eco Score</Text>
                        <Text style={styles.scoreValue}>
                            {((metrics.ecoScore || 0) * 100).toFixed(0)}
                        </Text>
                    </View>

                    <View style={styles.metricsGrid}>
                        <View style={styles.metricItem}>
                            <Text style={styles.metricLabel}>Speed</Text>
                            <Text style={styles.metricValue}>
                                {metrics.currentSpeed?.toFixed(1)} km/h
                            </Text>
                        </View>

                        <View style={styles.metricItem}>
                            <Text style={styles.metricLabel}>Acceleration</Text>
                            <Text style={styles.metricValue}>
                                {metrics.acceleration?.toFixed(1)} m/s²
                            </Text>
                        </View>

                        <View style={styles.metricItem}>
                            <Text style={styles.metricLabel}>Distance</Text>
                            <Text style={styles.metricValue}>
                                {(metrics.distance / 1000).toFixed(2)} km
                            </Text>
                        </View>

                        <View style={styles.metricItem}>
                            <Text style={styles.metricLabel}>Idle Time</Text>
                            <Text style={styles.metricValue}>
                                {metrics.idleTime?.toFixed(0)}s
                            </Text>
                        </View>

                        <View style={styles.metricItem}>
                            <Text style={styles.metricLabel}>Harsh Events</Text>
                            <Text style={styles.metricValue}>
                                {(metrics.harshAccelerations || 0) +
                                    (metrics.harshBraking || 0)}
                            </Text>
                        </View>
                    </View>
                </View>
            )}

            <View style={styles.buttonContainer}>
                <Pressable
                    style={[styles.button, styles.stopButton]}
                    onPress={stopDriving}
                >
                    <Text style={styles.buttonText}>Stop Driving</Text>
                </Pressable>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f5f5f5",
    },
    header: {
        backgroundColor: "#4CAF50",
        padding: 20,
        paddingTop: 50,
    },
    headerText: {
        color: "white",
        fontSize: 24,
        fontWeight: "bold",
    },
    metricsContainer: {
        padding: 20,
    },
    scoreCard: {
        backgroundColor: "white",
        padding: 20,
        borderRadius: 10,
        alignItems: "center",
        marginBottom: 20,
        elevation: 3,
    },
    scoreTitle: {
        fontSize: 18,
        color: "#666",
    },
    scoreValue: {
        fontSize: 48,
        fontWeight: "bold",
        color: "#4CAF50",
    },
    metricsGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-between",
    },
    metricItem: {
        backgroundColor: "white",
        width: "48%",
        padding: 15,
        borderRadius: 10,
        marginBottom: 15,
        elevation: 2,
    },
    metricLabel: {
        fontSize: 14,
        color: "#666",
    },
    metricValue: {
        fontSize: 20,
        fontWeight: "bold",
        color: "#333",
    },
    buttonContainer: {
        padding: 20,
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
    },
    button: {
        padding: 15,
        borderRadius: 10,
        alignItems: "center",
    },
    stopButton: {
        backgroundColor: "#f44336",
    },
    buttonText: {
        color: "white",
        fontSize: 18,
        fontWeight: "bold",
    },
});
