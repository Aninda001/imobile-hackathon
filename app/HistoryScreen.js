import React, { useState, useEffect } from "react";
import { StyleSheet, View, Text, FlatList, Pressable } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function HistoryScreen({ navigation }) {
    const [history, setHistory] = useState([]);

    useEffect(() => {
        loadHistory();
    }, []);
    useEffect(() => {
        const unsubscribe = navigation.addListener("beforeRemove", (e) => {
            e.preventDefault();
            navigation.navigate("Start");
        });

        return unsubscribe;
    }, [navigation]);
    const loadHistory = async () => {
        try {
            const historyData = await AsyncStorage.getItem("drivingHistory");
            if (historyData) {
                setHistory(JSON.parse(historyData));
            }
        } catch (error) {
            console.error("Error loading history:", error);
        }
    };

    const renderHistoryItem = ({ item }) => {
        const date = new Date(item.date);
        return (
            <View style={styles.historyCard}>
                <View style={styles.historyHeader}>
                    <Text style={styles.dateText}>
                        {date.toLocaleDateString()} {date.toLocaleTimeString()}
                    </Text>
                    <Text style={styles.scoreText}>
                        Score: {((item.metrics.ecoScore || 0) * 100).toFixed(0)}
                    </Text>
                </View>

                <View style={styles.metricsGrid}>
                    <View style={styles.metricItem}>
                        <Text style={styles.metricLabel}>Distance</Text>
                        <Text style={styles.metricValue}>
                            {(item.metrics.distance / 1000).toFixed(2)} km
                        </Text>
                    </View>

                    <View style={styles.metricItem}>
                        <Text style={styles.metricLabel}>Avg Speed</Text>
                        <Text style={styles.metricValue}>
                            {item.metrics.averageSpeed?.toFixed(1)} km/h
                        </Text>
                    </View>

                    <View style={styles.metricItem}>
                        <Text style={styles.metricLabel}>Idle Time</Text>
                        <Text style={styles.metricValue}>
                            {item.metrics.idleTime?.toFixed(0)}s
                        </Text>
                    </View>
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <FlatList
                data={history.reverse()}
                renderItem={renderHistoryItem}
                keyExtractor={(item) => item.date}
                contentContainerStyle={styles.listContainer}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f5f5f5",
    },
    listContainer: {
        padding: 15,
    },
    historyCard: {
        backgroundColor: "white",
        borderRadius: 10,
        padding: 15,
        marginBottom: 15,
        elevation: 2,
    },
    historyHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 10,
    },
    dateText: {
        fontSize: 16,
        color: "#666",
    },
    scoreText: {
        fontSize: 16,
        fontWeight: "bold",
        color: "#4CAF50",
    },
    metricsGrid: {
        flexDirection: "row",
        justifyContent: "space-between",
    },
    metricItem: {
        flex: 1,
        alignItems: "center",
    },
    metricLabel: {
        fontSize: 12,
        color: "#666",
    },
    metricValue: {
        fontSize: 16,
        fontWeight: "bold",
        color: "#333",
    },
});
