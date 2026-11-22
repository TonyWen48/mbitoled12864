
/*
 Micro:bit V2 / Mbit
 Ultrasonic + OLED12864_I2C + BUZZ

 Distance >= 40cm : Silent
 Distance < 40cm  : Beep
 Closer distance  : Faster beep
*/

// ===== Variables =====
let distance = -1
let alarmInterval = 0
let lastBeep = 0
let beepStart = 0
let beepActive = false
let continuous = false
let lastDisplay = 0
let status = "STARTING"

// ===== OLED =====
OLED12864_I2C.init(60)
OLED12864_I2C.zoom(false)
OLED12864_I2C.clear()

OLED12864_I2C.showString(
    0, 0, "MICRO:BIT RADAR", 1
)
OLED12864_I2C.showString(
    0, 2, "Initializing", 1
)

// ===== BUZZ =====
pins.analogSetPitchPin(AnalogPin.P0)
music.stopAllSounds()
basic.pause(1000)

// ===== Ultrasonic =====
function readDistance(): number {
    pins.digitalWritePin(DigitalPin.P16, 0)
    control.waitMicros(3)
    pins.digitalWritePin(DigitalPin.P16, 1)
    control.waitMicros(10)
    pins.digitalWritePin(DigitalPin.P16, 0)

    let duration = pins.pulseIn(
        DigitalPin.P15,
        PulseValue.High,
        25000
    )

    if (duration <= 0) {
        return -1
    }

    let cm = duration / 58

    if (cm < 2 || cm > 400) {
        return -1
    }

    return cm
}

// ===== Alarm Level =====
function setAlarmLevel(cm: number) {
    if (cm < 0) {
        status = "NO ECHO"
        alarmInterval = 0
    } else if (cm >= 40) {
        status = "SAFE"
        alarmInterval = 0
    } else if (cm >= 30) {
        status = "SLOW BEEP"
        alarmInterval = 700
    } else if (cm >= 20) {
        status = "BEEP"
        alarmInterval = 450
    } else if (cm >= 10) {
        status = "FAST BEEP"
        alarmInterval = 250
    } else if (cm >= 5) {
        status = "VERY CLOSE"
        alarmInterval = 120
    } else {
        status = "DANGER"
        alarmInterval = -1
    }
}

// ===== BUZZ Control =====
function updateBuzzer() {
    let now = input.runningTime()

    if (alarmInterval == 0) {
        if (beepActive || continuous) {
            music.stopAllSounds()
        }
        beepActive = false
        continuous = false
        lastBeep = now
        return
    }

    if (alarmInterval == -1) {
        if (!continuous) {
            music.stopAllSounds()
            music.ringTone(1200)
            continuous = true
            beepActive = false
        }
        return
    }

    if (continuous) {
        music.stopAllSounds()
        continuous = false
        beepActive = false
        lastBeep = now - alarmInterval
    }

    if (beepActive && now - beepStart >= 50) {
        music.stopAllSounds()
        beepActive = false
    }

    if (!beepActive &&
        now - lastBeep >= alarmInterval) {
        music.ringTone(1200)
        beepStart = now
        lastBeep = now
        beepActive = true
    }
}

// ===== OLED Display =====
function updateOLED(cm: number) {
    OLED12864_I2C.clear()

    OLED12864_I2C.showString(
        0, 0, "MICRO:BIT RADAR", 1
    )

    OLED12864_I2C.showString(
        0, 2, "DISTANCE:", 1
    )

    if (cm < 0) {
        OLED12864_I2C.showString(
            0, 3, "--- cm", 1
        )
    } else {
        let value = Math.round(cm * 10) / 10
        OLED12864_I2C.showString(
            0, 3, "" + value + " cm", 1
        )
    }

    OLED12864_I2C.showString(
        0, 5, "STATUS:", 1
    )

    OLED12864_I2C.showString(
        0, 6, status, 1
    )
}

// ===== Main Loop =====
basic.forever(function () {
    distance = readDistance()
    setAlarmLevel(distance)
    updateBuzzer()

    if (input.runningTime() - lastDisplay >= 250) {
        updateOLED(distance)
        lastDisplay = input.runningTime()
    }

    basic.pause(20)
})
