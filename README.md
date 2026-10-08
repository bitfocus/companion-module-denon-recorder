# companion-module-denon-recorder

This module controls a Denon USB/SD recorder over Ethernet.
Includes DN-700R, DN-900R, DN-500R, DN-F450R, DN-F650R

The rs232 only models (DN-500R, DN-F450R, DN-F650R) require an Ethernet to RS232 adapter.

## **V1.0.0** istnv

* base module derived from denon-dn-500bd-mkii by Andreas H. Thomsen <mc-hauge@hotmail.com>
* stripped invalid actions (no tray)
* added recording actions
*
* Minimal Record / Play control
* Feedback for some of the commands

## **V1.0.1** istnv

* fix rgb references

## **V1.0.2** julusian

* replace system 'emit' calls

## **V2.0.0** istnv

* Refactor for Companion V3.0

## **V2.0.1** istnv

* Fix transport action definition error

## **V2.0.2** istnv

* Update feedbacks for V3.0

## **V2.1.0** istnv

* experimental. no release

## **V2.2.0** istnv

* Update deps

## **V2.3.0** istnv

* Refactor for Companion V3.3

## **V2.3.1** dewiweb

* Add "Add Mark" action

## **V2.4.0** deweweb

* Bump version

## **V2.4.1** istnv

* Typo on documentation

## **V3.0.0** istnv

* Add variables for recorder status data
* Add feedbacks for more status conditions

## **V3.0.1**

* Fix variables: every recorder status value now has a variable (previously only some were defined)
* Add `transport` variable and formatted `track_et_fmt`, `track_rt_fmt`, `track_len_fmt` time variables
* Re-enable feedbacks (transport, power) and add Selected Media and Recording Input feedbacks
* Convert transport feedback to a boolean feedback (existing buttons are upgraded automatically)
* Add actions for media selection, record input/channels, record monitor/input volume and recording format
* Periodically refresh transport state (default every 2 s); track and time polling is optional
* Handle replies that are split across, or combined in, network packets
* Presets now show feedback, plus new status display presets
* Update to Node 22 runtime and current module tooling
