import React, { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Platform,
  Alert,
  ActivityIndicator,
  ImageBackground,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Calendar from "expo-calendar";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  FadeIn,
  FadeInDown,
} from "react-native-reanimated";

const CRIMSON = "#DC143C";
const NAVY_DEEP = "#0A0E1A";
const NAVY_CARD = "#1A2235";
const NAVY_BORDER = "#263148";
const GOLD = "#F59E0B";
const WHITE = "#FFFFFF";
const MUTED = "#64748B";
const SECONDARY = "#94A3B8";

function parseTime(hh: string, mm: string): number | null {
  const h = parseInt(hh, 10);
  const m = parseInt(mm, 10);
  if (isNaN(h) || isNaN(m)) return null;
  if (h < 0 || h > 23) return null;
  if (m < 0 || m > 59) return null;
  return h * 60 + m;
}

function formatDuration(totalMinutes: number): string {
  const absMin = Math.abs(totalMinutes);
  const h = Math.floor(absMin / 60);
  const m = absMin % 60;
  const sign = totalMinutes < 0 ? "-" : "";
  return `${sign}${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

interface TimeCardProps {
  label: string;
  hoursValue: string;
  minutesValue: string;
  onHoursChange: (v: string) => void;
  onMinutesChange: (v: string) => void;
  hoursRef?: React.RefObject<TextInput | null>;
  minutesRef?: React.RefObject<TextInput | null>;
  nextRef?: React.RefObject<TextInput | null>;
  animDelay?: number;
}

function TimeCard({
  label,
  hoursValue,
  minutesValue,
  onHoursChange,
  onMinutesChange,
  hoursRef,
  minutesRef,
  nextRef,
  animDelay = 0,
}: TimeCardProps) {
  const isStart = label === "DUTY START";

  const handleHoursChange = (text: string) => {
    const clean = text.replace(/[^0-9]/g, "").slice(0, 2);
    onHoursChange(clean);
    if (clean.length === 2) {
      minutesRef?.current?.focus();
    }
  };

  const handleMinutesChange = (text: string) => {
    const clean = text.replace(/[^0-9]/g, "").slice(0, 2);
    onMinutesChange(clean);
    if (clean.length === 2 && nextRef) {
      nextRef.current?.focus();
    }
  };

  return (
    <Animated.View entering={FadeInDown.delay(animDelay).springify()}>
      <View style={styles.card}>
        <View style={styles.cardAccent} />
        <View style={styles.cardHeader}>
          <View style={styles.cardLabelRow}>
            <MaterialCommunityIcons
              name={isStart ? "clock-start" : "clock-end"}
              size={16}
              color={CRIMSON}
            />
            <Text style={styles.cardLabel}>{label}</Text>
          </View>
          <View style={styles.timezoneBadge}>
            <Ionicons name="location" size={10} color={MUTED} />
            <Text style={styles.timezoneText}>HOMEBASE TIME ZONE</Text>
          </View>
        </View>

        <View style={styles.timeInputRow}>
          <View style={styles.timeSegment}>
            <Text style={styles.timeSegmentLabel}>HH</Text>
            <TextInput
              ref={hoursRef}
              style={styles.timeInput}
              value={hoursValue}
              onChangeText={handleHoursChange}
              keyboardType="number-pad"
              maxLength={2}
              placeholder="--"
              placeholderTextColor={MUTED}
              returnKeyType="next"
              onSubmitEditing={() => minutesRef?.current?.focus()}
              selectTextOnFocus
            />
          </View>
          <Text style={styles.colonSeparator}>:</Text>
          <View style={styles.timeSegment}>
            <Text style={styles.timeSegmentLabel}>MM</Text>
            <TextInput
              ref={minutesRef}
              style={styles.timeInput}
              value={minutesValue}
              onChangeText={handleMinutesChange}
              keyboardType="number-pad"
              maxLength={2}
              placeholder="--"
              placeholderTextColor={MUTED}
              returnKeyType={nextRef ? "next" : "done"}
              onSubmitEditing={() => nextRef?.current?.focus()}
              selectTextOnFocus
            />
          </View>
        </View>

        <View style={styles.cardFooterHint}>
          <Text style={styles.cardFooterHintText}>24-hour format (e.g. 14:30)</Text>
        </View>
      </View>
    </Animated.View>
  );
}

interface ResultCardProps {
  mbntMinutes: number | null;
  dutyMinutes: number | null;
}

function ResultCard({ mbntMinutes, dutyMinutes }: ResultCardProps) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  React.useEffect(() => {
    if (mbntMinutes !== null) {
      scale.value = withSpring(1.02, { damping: 8 }, () => {
        scale.value = withSpring(1);
      });
    }
  }, [mbntMinutes]);

  if (mbntMinutes === null) {
    return (
      <Animated.View entering={FadeInDown.delay(400).springify()}>
        <View style={[styles.card, styles.resultCardEmpty]}>
          <View style={styles.resultEmptyContent}>
            <MaterialCommunityIcons name="calculator-variant" size={32} color={MUTED} />
            <Text style={styles.resultEmptyText}>Enter duty times to calculate</Text>
          </View>
        </View>
      </Animated.View>
    );
  }

  const mbntStr = formatDuration(mbntMinutes);
  const dutyStr = dutyMinutes !== null ? formatDuration(dutyMinutes) : "--:--";
  const isPositive = mbntMinutes >= 0;

  return (
    <Animated.View entering={FadeInDown.delay(400).springify()} style={animStyle}>
      <View style={[styles.card, styles.resultCard]}>
        <View style={[styles.cardAccent, styles.resultCardAccent]} />
        <View style={styles.resultHeader}>
          <MaterialCommunityIcons name="calculator-variant" size={16} color={GOLD} />
          <Text style={styles.resultHeaderText}>CALCULATION RESULT</Text>
        </View>

        <View style={styles.dutyDurationRow}>
          <Text style={styles.dutyDurationLabel}>DUTY DURATION</Text>
          <Text style={styles.dutyDurationValue}>{dutyStr}</Text>
        </View>

        <View style={styles.subtractionRow}>
          <MaterialCommunityIcons name="minus" size={14} color={MUTED} />
          <Text style={styles.subtractionText}>5 HRS 40 MINS</Text>
        </View>

        <View style={styles.resultDivider} />

        <View style={styles.mbntRow}>
          <Text style={styles.mbntLabel}>MBNT</Text>
          <Text style={styles.mbntEquals}>=</Text>
          <Text style={[styles.mbntValue, !isPositive && styles.mbntValueNegative]}>
            {mbntStr}
          </Text>
        </View>

        {!isPositive && (
          <View style={styles.warningRow}>
            <Ionicons name="warning" size={12} color={CRIMSON} />
            <Text style={styles.warningText}>Duty period under minimum threshold</Text>
          </View>
        )}
      </View>
    </Animated.View>
  );
}

interface CalendarButtonProps {
  onPress: () => void;
  isLoading: boolean;
  disabled: boolean;
}

function CalendarButton({ onPress, isLoading, disabled }: CalendarButtonProps) {
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    scale.value = withSpring(0.96, { damping: 10 }, () => {
      scale.value = withSpring(1);
    });
    onPress();
  };

  return (
    <Animated.View entering={FadeInDown.delay(500).springify()} style={animStyle}>
      <TouchableOpacity
        onPress={handlePress}
        disabled={disabled || isLoading}
        style={[styles.calendarButton, disabled && styles.calendarButtonDisabled]}
        activeOpacity={0.85}
      >
        {isLoading ? (
          <ActivityIndicator color={WHITE} size="small" />
        ) : (
          <Ionicons name="calendar-outline" size={20} color={disabled ? MUTED : WHITE} />
        )}
        <Text style={[styles.calendarButtonText, disabled && styles.calendarButtonTextDisabled]}>
          {isLoading ? "Adding to Calendar..." : "ADD TO CALENDAR"}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function DutyCalculator() {
  const insets = useSafeAreaInsets();

  const [startHH, setStartHH] = useState("");
  const [startMM, setStartMM] = useState("");
  const [endHH, setEndHH] = useState("");
  const [endMM, setEndMM] = useState("");
  const [calLoading, setCalLoading] = useState(false);

  const startHHRef = useRef<TextInput>(null);
  const startMMRef = useRef<TextInput>(null);
  const endHHRef = useRef<TextInput>(null);
  const endMMRef = useRef<TextInput>(null);

  const startMinutes = parseTime(startHH, startMM);
  const endMinutes = parseTime(endHH, endMM);

  let dutyMinutes: number | null = null;
  let mbntMinutes: number | null = null;

  if (startMinutes !== null && endMinutes !== null) {
    dutyMinutes = endMinutes - startMinutes;
    if (dutyMinutes < 0) dutyMinutes += 1440;
    mbntMinutes = dutyMinutes - 340;
  }

  const hasResult = mbntMinutes !== null;

  const handleClear = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStartHH("");
    setStartMM("");
    setEndHH("");
    setEndMM("");
  }, []);

  const handleAddToCalendar = useCallback(async () => {
    if (startMinutes === null || endMinutes === null || mbntMinutes === null) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCalLoading(true);

    try {
      const { status } = await Calendar.requestCalendarPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Calendar Access Required",
          "Please grant calendar access in Settings to add duty events.",
          [{ text: "OK" }]
        );
        setCalLoading(false);
        return;
      }

      const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
      const writable = calendars.find(
        (c) => c.allowsModifications && (c.type === "local" || c.type === "caldav")
      );
      const defaultCal = writable || calendars[0];

      if (!defaultCal) {
        Alert.alert("No Calendar Found", "No writable calendar found on this device.");
        setCalLoading(false);
        return;
      }

      const today = new Date();
      const startDate = new Date(today);
      startDate.setHours(Math.floor(startMinutes / 60), startMinutes % 60, 0, 0);

      const endDate = new Date(today);
      endDate.setHours(Math.floor(endMinutes / 60), endMinutes % 60, 0, 0);
      if (endDate <= startDate) {
        endDate.setDate(endDate.getDate() + 1);
      }

      const mbntStr = formatDuration(mbntMinutes);
      const dutyStr = dutyMinutes !== null ? formatDuration(dutyMinutes) : "--:--";

      await Calendar.createEventAsync(defaultCal.id, {
        title: `MBNT`,
        startDate,
        endDate,
        notes: `Duty Duration: ${dutyStr}\nMBNT = ${mbntStr}\n\nAll times in homebase time zone.`,
        alarms: [{ relativeOffset: -60 }],
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        "Added to Calendar",
        `Duty event added successfully.\nMBNT = ${mbntStr}`,
        [{ text: "OK" }]
      );
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Could not add event to calendar. Please try again.");
    } finally {
      setCalLoading(false);
    }
  }, [startMinutes, endMinutes, mbntMinutes, dutyMinutes]);

  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <ImageBackground
      source={require("../../assets/images/aircraft-bg.png")}
      style={styles.root}
      resizeMode="cover"
    >
      <View style={[StyleSheet.absoluteFillObject, styles.overlay]} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: topPadding + 16, paddingBottom: bottomPadding + 24 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeIn.delay(100)} style={styles.header}>
          <View style={styles.headerTopRow}>
            <View style={styles.logoMark}>
              <MaterialCommunityIcons name="airplane" size={18} color={WHITE} style={styles.logoPlane} />
              <Text style={styles.logoText}>SH</Text>
            </View>
            {(startHH || startMM || endHH || endMM) ? (
              <TouchableOpacity onPress={handleClear} style={styles.clearButton}>
                <Ionicons name="refresh" size={16} color={SECONDARY} />
                <Text style={styles.clearButtonText}>CLEAR</Text>
              </TouchableOpacity>
            ) : null}
          </View>
          <Text style={styles.appTitle}>MBNTMATE</Text>
          <Text style={styles.appSubtitle}>BY JETLOGIX</Text>
          <View style={styles.headerDivider} />
        </Animated.View>

        <TimeCard
          label="DUTY START"
          hoursValue={startHH}
          minutesValue={startMM}
          onHoursChange={setStartHH}
          onMinutesChange={setStartMM}
          hoursRef={startHHRef}
          minutesRef={startMMRef}
          nextRef={endHHRef}
          animDelay={200}
        />

        <View style={styles.cardSpacer} />

        <TimeCard
          label="DUTY END"
          hoursValue={endHH}
          minutesValue={endMM}
          onHoursChange={setEndHH}
          onMinutesChange={setEndMM}
          hoursRef={endHHRef}
          minutesRef={endMMRef}
          animDelay={300}
        />

        <View style={styles.cardSpacer} />

        <ResultCard mbntMinutes={mbntMinutes} dutyMinutes={dutyMinutes} />

        {hasResult && (
          <>
            <View style={styles.cardSpacer} />
            <CalendarButton
              onPress={handleAddToCalendar}
              isLoading={calLoading}
              disabled={!hasResult}
            />
          </>
        )}

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            All times must be entered in homebase time zone
          </Text>
        </View>
      </ScrollView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: NAVY_DEEP,
  },
  overlay: {
    backgroundColor: "rgba(10, 14, 26, 0.60)",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    gap: 0,
  },

  header: {
    marginBottom: 28,
  },
  headerTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  logoMark: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: CRIMSON,
    alignItems: "center",
    justifyContent: "center",
    gap: 1,
    shadowColor: CRIMSON,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  logoPlane: {
    transform: [{ rotate: "45deg" }],
  },
  logoText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    color: WHITE,
    letterSpacing: 2,
  },
  clearButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "rgba(148, 163, 184, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.15)",
  },
  clearButtonText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: SECONDARY,
    letterSpacing: 1.2,
  },
  appTitle: {
    fontSize: 40,
    fontFamily: "Inter_700Bold",
    color: WHITE,
    letterSpacing: 6,
    lineHeight: 44,
  },
  appSubtitle: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: CRIMSON,
    letterSpacing: 6,
    lineHeight: 36,
  },
  headerDivider: {
    height: 2,
    backgroundColor: CRIMSON,
    width: 60,
    marginTop: 16,
    borderRadius: 1,
  },

  card: {
    backgroundColor: NAVY_CARD,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: NAVY_BORDER,
    padding: 20,
    overflow: "hidden",
  },
  cardAccent: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 4,
    height: "100%",
    backgroundColor: CRIMSON,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  cardSpacer: {
    height: 14,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingLeft: 8,
  },
  cardLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  cardLabel: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: WHITE,
    letterSpacing: 2,
  },
  timezoneBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: "rgba(100, 116, 139, 0.15)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(100, 116, 139, 0.25)",
  },
  timezoneText: {
    fontSize: 9,
    fontFamily: "Inter_600SemiBold",
    color: MUTED,
    letterSpacing: 0.8,
  },

  timeInputRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingLeft: 8,
    gap: 0,
  },
  timeSegment: {
    alignItems: "center",
    flex: 1,
  },
  timeSegmentLabel: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    color: MUTED,
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  timeInput: {
    fontSize: 52,
    fontFamily: "Inter_700Bold",
    color: WHITE,
    textAlign: "center",
    width: "100%",
    paddingVertical: 4,
    includeFontPadding: false,
  },
  colonSeparator: {
    fontSize: 48,
    fontFamily: "Inter_700Bold",
    color: CRIMSON,
    marginTop: 16,
    paddingHorizontal: 4,
  },
  cardFooterHint: {
    marginTop: 10,
    paddingLeft: 8,
  },
  cardFooterHintText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: MUTED,
    letterSpacing: 0.3,
  },

  resultCardEmpty: {
    borderStyle: "dashed",
  },
  resultCard: {},
  resultCardAccent: {
    backgroundColor: GOLD,
  },
  resultEmptyContent: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
    gap: 10,
  },
  resultEmptyText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: MUTED,
    letterSpacing: 0.3,
  },
  resultHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginBottom: 18,
    paddingLeft: 8,
  },
  resultHeaderText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    color: GOLD,
    letterSpacing: 2,
  },
  dutyDurationRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingLeft: 8,
    marginBottom: 6,
  },
  dutyDurationLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: MUTED,
    letterSpacing: 1.5,
  },
  dutyDurationValue: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: SECONDARY,
    letterSpacing: 2,
  },
  subtractionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingLeft: 8,
    marginBottom: 14,
  },
  subtractionText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: MUTED,
    letterSpacing: 1,
  },
  resultDivider: {
    height: 1,
    backgroundColor: NAVY_BORDER,
    marginBottom: 16,
    marginLeft: 8,
  },
  mbntRow: {
    flexDirection: "row",
    alignItems: "baseline",
    paddingLeft: 8,
    gap: 12,
  },
  mbntLabel: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: GOLD,
    letterSpacing: 4,
  },
  mbntEquals: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: WHITE,
  },
  mbntValue: {
    fontSize: 48,
    fontFamily: "Inter_700Bold",
    color: GOLD,
    letterSpacing: 2,
    flex: 1,
    textAlign: "right",
  },
  mbntValueNegative: {
    color: CRIMSON,
  },
  warningRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
    paddingLeft: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(220, 20, 60, 0.2)",
  },
  warningText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: CRIMSON,
    letterSpacing: 0.3,
  },

  calendarButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: CRIMSON,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 24,
    shadowColor: CRIMSON,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  calendarButtonDisabled: {
    backgroundColor: NAVY_CARD,
    borderWidth: 1,
    borderColor: NAVY_BORDER,
    shadowOpacity: 0,
    elevation: 0,
  },
  calendarButtonText: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: WHITE,
    letterSpacing: 2,
  },
  calendarButtonTextDisabled: {
    color: MUTED,
  },

  footer: {
    marginTop: 24,
    alignItems: "center",
  },
  footerText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: MUTED,
    textAlign: "center",
    letterSpacing: 0.3,
  },
});
