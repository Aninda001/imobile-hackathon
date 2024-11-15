import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import StartScreen from "./startscreen";
import DashboardScreen from "./DashboardScreen";
import HistoryScreen from "./HistoryScreen";
import { TouchableOpacity, Button } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const Stack = createNativeStackNavigator();

export default function App() {
    return (
        <Stack.Navigator>
            <Stack.Screen
                name="Start"
                component={StartScreen}
                options={{ headerShown: false }}
            />
            <Stack.Screen
                name="Dashboard"
                component={DashboardScreen}
                options={{ headerShown: false }}
            />
            <Stack.Screen
                name="History"
                component={HistoryScreen}
                options={({ navigation }) => ({
                    title: "Driving History",
                })}
            />
        </Stack.Navigator>
    );
}
