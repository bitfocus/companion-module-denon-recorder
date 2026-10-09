# Denon SSD/USB Recorders

This module controls a Denon USB/SD recorder over Ethernet.
Includes DN-700R, DN-900R, DN-500R, DN-F450R, DN-F650R

The older RS232 only models (DN-500R, DN-F450R, DN-F650R) can be controlled with a USB to RS232 adapter via the `Generic: TCP Serial Port` module in Companion or an external Ethernet to RS232 adapter.

## **Available commands:**

### Power Control

* Power On
* Power Standby (Off)

### Media Selection

* Set Media to SD1
* Set Media to SD2
* Set Media to USB
* Set Media to Network

### Recording Controls

#### Record Input Selection

* Set Record Input to RCA
* Set Record Input to XLR
* Set Record Input to Coax
* Set Record Input to AES/EBU
* Record Mode: Stereo
* Record Mode: Mono Left
* Record Mode: Mono L+R Mix

#### Recording Actions

* Initiate Recording
* Pause Recording
* Split Recording (Create new track while recording)
* One Touch Record On/Off
* Add Mark (Add track marker)

#### Record Monitoring

* Record Monitor On/Off
* Input Volume Mode: Fixed/Variable
* Volume Controls:
  * L+R Volume: Up/Down 1dB
  * Left Channel: Up/Down 1dB
  * Right Channel: Up/Down 1dB
  * Balance: Left/Right 1dB

#### Recording Format

* PCM: 16-bit / 24-bit
* MP3: 64K / 128K / 192K / 256K / 320K

### Playback Controls

* Play
* Pause
* Stop
* Track Selection:
  * Next Track
  * Previous Track/Restart
  * Select Specific Track

### Transport Status

* Transport Off
* Stopped
* Playing
* Paused
* Record Pause
* Recording

### Panel Controls

* Panel Lock
* Panel Unlock
* Transport Lock

### Other

* Format current media (erases it!)
* Custom command (sent as `@0<command>`)

## Configuration

* **Target IP / Port**: address of the recorder (port 23 by default)
* **Transport poll interval**: how often the transport state is re-read from the recorder (default 2000 ms, minimum 500 ms). Set to 0 to only refresh after commands and when the recorder reports a change.
* **Also poll track and time values**: off by default. When on, track number, elapsed/remaining time and remaining record time are refreshed on each poll as well.

## Presets

* Buttons for most commands, with feedback for transport, power, media and input
* Status display buttons (transport, track, elapsed/remaining time, record time left, media)

## Feedbacks

* Transport State (Off / Stopped / Playing / Paused / Record Pause / Recording)
* Power Status (On / Off)
* Selected Media (SD1 / SD2 / USB / Network)
* Recording Input (RCA / XLR / Coax / AES)

## Variables

All status values reported by the recorder are available as variables. Commonly used ones:

| Variable | Description |
| --- | --- |
| `transport` | Transport state (Playing, Recording, ...) |
| `status` | Detailed device status |
| `power` | Power status |
| `media` | Selected media |
| `track_cur` / `track_tot` | Current track / total tracks |
| `track_et` / `track_et_fmt` | Track elapsed time (raw / H:MM:SS) |
| `track_rt` / `track_rt_fmt` | Track remaining time (raw / H:MM:SS) |
| `track_len` / `track_len_fmt` | Track length (raw / M:SS) |
| `rec_remain` | Remaining record time |
| `rec_input`, `rec_fmt`, `rec_rate`, `rec_channel` | Recording settings |
| `title`, `artist`, `album` | Track metadata |
| `folder_name` | Current folder |
| `dev_name` | Device name |

Settings such as input/output adjust, phantom power and mic sensitivity have `_l` and `_r` variables for each channel.

Thanks and appreciation to Brian Singerman for sponsoring the recent updates for feedback and variable support.<br>
Also, thanks and appreciation to Kevin Haddock for sponsoring the initial work on this module.

--------
Contributions for development of this open source module are always welcome
<https://github.com/sponsors/istnv>
