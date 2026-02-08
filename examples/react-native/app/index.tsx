import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { fetch } from "expo/fetch";
import Constants from "expo-constants";
import {
  Renderer,
  DataProvider,
  VisibilityProvider,
  ActionProvider,
  ValidationProvider,
  useUIStream,
  createStandardActionHandlers,
} from "@json-render/react-native";

// Resolve the Metro dev server origin for API route calls.
// expo/fetch doesn't resolve relative URLs like the built-in RN fetch does.
function getApiBaseUrl(): string {
  const debuggerHost =
    Constants.expoConfig?.hostUri ??
    Constants.manifest2?.extra?.expoGo?.debuggerHost;
  if (debuggerHost) {
    const host = debuggerHost.split(":").shift();
    // Metro dev server runs on port 8081 by default
    return `http://${host}:8081`;
  }
  return "http://localhost:8081";
}

const API_BASE = getApiBaseUrl();

export default function HomeScreen() {
  const [prompt, setPrompt] = useState("");
  const [data, setData] = useState<Record<string, unknown>>({});
  const scrollViewRef = useRef<ScrollView>(null);

  const { spec, isStreaming, error, send, clear } = useUIStream({
    api: `${API_BASE}/api/generate`,
    fetch,
    onError: (err) => console.error("Generation error:", err),
    onComplete: () => {
      // Scroll to bottom when generation completes
      scrollViewRef.current?.scrollToEnd({ animated: true });
    },
  });

  const actionHandlers = createStandardActionHandlers({
    onSetData: (path, value) => {
      setData((prev) => ({ ...prev, [path]: value }));
    },
  });

  const handleGenerate = async () => {
    if (!prompt.trim() || isStreaming) return;

    await send(prompt.trim(), {
      previousSpec: spec ?? undefined,
    });
  };

  const handleClear = () => {
    clear();
    setPrompt("");
    setData({});
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>json-render</Text>
          <Text style={styles.subtitle}>Describe a UI and watch it appear</Text>
        </View>

        {/* Generated UI Area */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.flex}
          contentContainerStyle={styles.contentContainer}
          keyboardShouldPersistTaps="handled"
        >
          {!spec && !isStreaming && !error && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No UI generated yet</Text>
              <Text style={styles.emptyText}>
                Try something like "a settings page with a dark mode toggle,
                notification preferences, and a profile card with an avatar"
              </Text>
            </View>
          )}

          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorTitle}>Generation failed</Text>
              <Text style={styles.errorText}>{error.message}</Text>
            </View>
          )}

          {(spec || isStreaming) && (
            <DataProvider initialData={data}>
              <VisibilityProvider>
                <ActionProvider handlers={actionHandlers}>
                  <ValidationProvider>
                    <Renderer spec={spec} loading={isStreaming} />
                  </ValidationProvider>
                </ActionProvider>
              </VisibilityProvider>
            </DataProvider>
          )}

          {isStreaming && (
            <View style={styles.streamingIndicator}>
              <ActivityIndicator size="small" color="#3b82f6" />
              <Text style={styles.streamingText}>Generating...</Text>
            </View>
          )}
        </ScrollView>

        {/* Input Area */}
        <View style={styles.inputArea}>
          {spec && (
            <Pressable onPress={handleClear} style={styles.clearButton}>
              <Text style={styles.clearButtonText}>Clear</Text>
            </Pressable>
          )}
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={prompt}
              onChangeText={setPrompt}
              placeholder="Describe a UI..."
              placeholderTextColor="#9ca3af"
              multiline
              maxLength={500}
              returnKeyType="send"
              blurOnSubmit
              onSubmitEditing={handleGenerate}
              editable={!isStreaming}
            />
            <Pressable
              style={[
                styles.sendButton,
                (!prompt.trim() || isStreaming) && styles.sendButtonDisabled,
              ]}
              onPress={handleGenerate}
              disabled={!prompt.trim() || isStreaming}
            >
              {isStreaming ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.sendButtonText}>Generate</Text>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  flex: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    backgroundColor: "#ffffff",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
  },
  subtitle: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 2,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 20,
  },
  errorContainer: {
    backgroundColor: "#fef2f2",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#dc2626",
    marginBottom: 4,
  },
  errorText: {
    fontSize: 14,
    color: "#991b1b",
  },
  streamingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    gap: 8,
  },
  streamingText: {
    fontSize: 14,
    color: "#3b82f6",
  },
  inputArea: {
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    backgroundColor: "#ffffff",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  clearButton: {
    alignSelf: "flex-end",
    marginBottom: 8,
  },
  clearButtonText: {
    fontSize: 14,
    color: "#6b7280",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: "#111827",
    backgroundColor: "#f9fafb",
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: "#3b82f6",
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
});
