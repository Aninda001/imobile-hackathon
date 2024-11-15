import React from "react";
import {
    StyleSheet,
    View,
    Pressable,
    Text,
    ImageBackground,
} from "react-native";

export default function StartScreen({ navigation }) {
    return (
        <ImageBackground
            source={require("../assets/wallhaven-4818ky_1920x1080.png")}
            style={styles.background}
        >
            <View style={styles.container}>
                <View style={styles.contentContainer}>
                    <Text style={styles.title}>EcoDrive</Text>
                    <Text style={styles.subtitle}>
                        Drive Smarter, Save Better
                    </Text>

                    <Pressable
                        style={({ pressed }) => [
                            styles.startButton,
                            pressed && styles.buttonPressed,
                        ]}
                        onPress={() => navigation.navigate("Dashboard")}
                    >
                        <Text style={styles.buttonText}>START</Text>
                    </Pressable>

                    <Pressable
                        style={styles.historyButton}
                        onPress={() => navigation.navigate("History")}
                    >
                        <Text style={styles.historyButtonText}>
                            View History
                        </Text>
                    </Pressable>
                </View>
            </View>
        </ImageBackground>
    );
}

const styles = StyleSheet.create({
    background: {
        flex: 1,
    },
    container: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
    },
    contentContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },
    title: {
        fontSize: 48,
        fontWeight: "bold",
        color: "white",
        marginBottom: 10,
    },
    subtitle: {
        fontSize: 18,
        color: "white",
        marginBottom: 50,
    },
    startButton: {
        backgroundColor: "#4CAF50",
        paddingHorizontal: 60,
        paddingVertical: 20,
        borderRadius: 30,
        elevation: 3,
    },
    buttonPressed: {
        backgroundColor: "#388E3C",
    },
    buttonText: {
        color: "white",
        fontSize: 24,
        fontWeight: "bold",
    },
    historyButton: {
        marginTop: 20,
        padding: 10,
    },
    historyButtonText: {
        color: "white",
        fontSize: 16,
    },
});
