# companion-module-denon-recorder

This module controls a Denon USB/SD recorder over Ethernet.
Includes DN-700R, DN-900R, DN-500R, DN-F450R, DN-F650R

The rs232 only models (DN-500R, DN-F450R, DN-F650R) require an Ethernet to RS232 adapter.


**V1.0.0** istnv
* base module derived from denon-dn-500bd-mkii by Andreas H. Thomsen <mc-hauge@hotmail.com>
* stripped invalid actions (no tray)
* added recording actions
*
* Minimal Record / Play control
* Feedback for some of the commands

**V1.0.1** istnv
* fix rgb references

**V1.0.2** julusian
* replace system 'emit' calls

*V2.0.0** istnv
* Refactor for Companion V3.0