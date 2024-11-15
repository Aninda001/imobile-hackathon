// Location and motion data collection utility
import * as Location from "expo-location";
import { Accelerometer } from "expo-sensors";
import haversine from "haversine"; // For calculating distance between coordinates

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
        };
    }

    async initialize() {
        try {
            // Request permissions
            const { status } =
                await Location.requestForegroundPermissionsAsync();
            if (status !== "granted") {
                throw new Error("Location permission denied");
            }

            // Configure location tracking
            await Location.enableNetworkProviderAsync();

            // Start location tracking with high accuracy
            this.startTracking();
        } catch (error) {
            console.error("Error initializing:", error);
            throw error;
        }
    }

    startTracking() {
        // Configure location tracking options
        const locationOptions = {
            accuracy: Location.Accuracy.BestForNavigation,
            timeInterval: 1000, // Update every second
            distanceInterval: 1, // Update every meter
        };

        // Start location tracking
        this.locationSubscription = Location.watchPositionAsync(
            locationOptions,
            this.handleLocationUpdate,
        );

        // Start accelerometer tracking
        Accelerometer.setUpdateInterval(100); // 10 updates per second
        this.accelerometerSubscription = Accelerometer.addListener(
            this.handleAccelerometerUpdate,
        );
    }

    handleLocationUpdate = (location) => {
        const { latitude, longitude, speed, timestamp } = location.coords;
        const currentTimestamp = timestamp || Date.now();

        // Store current location
        this.drivingData.coordinates.push({ latitude, longitude });
        this.drivingData.timestamps.push(currentTimestamp);

        // Calculate speed if not provided by GPS
        let currentSpeed = speed;
        if (!speed && this.previousLocation) {
            const distance = this.calculateDistance(this.previousLocation, {
                latitude,
                longitude,
            });
            const timeDiff = (currentTimestamp - this.previousTimestamp) / 1000; // Convert to seconds
            currentSpeed = distance / timeDiff; // meters per second
        }

        // Convert speed to km/h
        currentSpeed = currentSpeed * 3.6;
        this.drivingData.speeds.push(currentSpeed);

        // Calculate acceleration
        if (this.previousSpeed !== null && this.previousTimestamp !== null) {
            const timeDiff = (currentTimestamp - this.previousTimestamp) / 1000;
            const acceleration = (currentSpeed - this.previousSpeed) / timeDiff;
            this.drivingData.accelerations.push(acceleration);
        }

        // Update distance
        if (this.previousLocation) {
            const segmentDistance = this.calculateDistance(
                this.previousLocation,
                { latitude, longitude },
            );
            this.drivingData.distance += segmentDistance;
        }

        // Check for idle state (speed less than 3 km/h)
        this.updateIdleTime(currentSpeed, currentTimestamp);

        // Update previous values
        this.previousLocation = { latitude, longitude };
        this.previousSpeed = currentSpeed;
        this.previousTimestamp = currentTimestamp;
    };

    handleAccelerometerUpdate = (accelerometerData) => {
        const { x, y, z } = accelerometerData;
        // Calculate total acceleration magnitude
        const accelerationMagnitude = Math.sqrt(x * x + y * y + z * z);
        // Store acceleration data
        this.drivingData.accelerations.push(accelerationMagnitude);
    };

    calculateDistance(start, end) {
        return haversine(start, end, { unit: "meter" });
    }

    updateIdleTime(currentSpeed, currentTimestamp) {
        const IDLE_SPEED_THRESHOLD = 3; // km/h

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

    getDrivingMetrics() {
        const { speeds, accelerations, distance, idleTime } = this.drivingData;

        return {
            currentSpeed: speeds[speeds.length - 1] || 0,
            averageSpeed: speeds.reduce((a, b) => a + b, 0) / speeds.length,
            maxSpeed: Math.max(...speeds),
            distance: distance,
            idleTime: idleTime,
            acceleration: accelerations[accelerations.length - 1] || 0,
            averageAcceleration:
                accelerations.reduce((a, b) => a + b, 0) / accelerations.length,
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

// Example usage in a React component
export default function DrivingMonitor() {
    const [metrics, setMetrics] = useState(null);
    const [collector, setCollector] = useState(null);

    useEffect(() => {
        const initializeCollector = async () => {
            const newCollector = new DrivingDataCollector();
            await newCollector.initialize();
            setCollector(newCollector);

            // Update metrics every second
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

    return (
        <View>
            {metrics && (
                <>
                    <Text>
                        Current Speed: {metrics.currentSpeed.toFixed(1)} km/h
                    </Text>
                    <Text>
                        Average Speed: {metrics.averageSpeed.toFixed(1)} km/h
                    </Text>
                    <Text>
                        Distance: {(metrics.distance / 1000).toFixed(2)} km
                    </Text>
                    <Text>
                        Idle Time: {metrics.idleTime.toFixed(0)} seconds
                    </Text>
                    <Text>
                        Current Acceleration: {metrics.acceleration.toFixed(2)}{" "}
                        m/s²
                    </Text>
                </>
            )}
        </View>
    );
}
