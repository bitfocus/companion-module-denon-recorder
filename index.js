var tcp = require('../../tcp');
var instance_skel = require('../../instance_skel');
var debug;
var log;

function pad2(num) {
	var s = "00" + num;
	return s.substr(s.length - 2);
}

function pad4(num) {
	var s = "0000" + num;
	return s.substr(s.length - 4);
}

function instance(system, id, config) {
	var self = this;

	// super-constructor
	instance_skel.apply(this, arguments);

	self.actions(); // export actions
	self.init_presets();

	return self;
}

instance.prototype.updateConfig = function (config) {
	var self = this;
	self.init_presets();

	if (self.socket !== undefined) {
		self.socket.destroy();
		delete self.socket;
	}

	self.config = config;
	self.init_tcp();
};

instance.prototype.init = function () {
	var self = this;

	self.hasError = false;
	debug = self.debug;
	log = self.log;
	self.init_presets();
	self.init_tcp();
};

instance.prototype.init_tcp = function () {
	var self = this;

	if (self.socket !== undefined) {
		self.socket.destroy();
		delete self.socket;
	}

	self.status(self.STATE_WARNING, 'Connecting');

	if (self.config.host) {
		self.socket = new tcp(self.config.host, self.config.port);

		// self.socket.on('status_change', function (status, message) {
		// 	self.status(status, message);
		// });

		self.socket.on('error', function (err) {
			if (!self.hasError) {
				debug("Network error", err);
				self.status(self.STATE_ERROR, err.message);
				self.log('error', "Network error: " + err.message);
				self.hasError = true;
			}
		});

		self.socket.on('connect', function () {
			self.status(self.STATE_OK);
			self.hasError = false;
			debug("Connected");
			console.log("Sending @0?PW");
			self.socket.send("@0?PW\r");
		});

		self.socket.on('data', function (chunk) {
			var hasAck = chunk.readInt8(0) == 6;
			var resp = chunk.toString(undefined,1);

			debug("Received " + chunk.length + " bytes of data.", chunk);
			// response or auto-status?
			debug("First character is ACK: ", hasAck);
			// status request response
			debug("Response is: '" + resp + "'");

			console.log("Received " + chunk.length + " bytes of data.", chunk);
			// response or auto-status?
			console.log("First character is ACK: ", hasAck);
			// status request response
			console.log("Response is: '" + resp + "'");
		});
	}
};


// Return config fields for web config
instance.prototype.config_fields = function () {
	var self = this;

	return [
		{
			type: 'textinput',
			id: 'host',
			label: 'Target IP',
			width: 5,
			regex: self.REGEX_IP
		},
		{
			type: 'textinput',
			id: 'port',
			label: 'Target Port (Default: 23)',
			width: 3,
			default: 23,
			regex: self.REGEX_PORT
		}
	];
};

// When module gets deleted
instance.prototype.destroy = function () {
	var self = this;

	if (self.socket !== undefined) {
		self.socket.destroy();
	}

	debug("destroy", self.id);
};

instance.prototype.CHOICES_POWER = [
	{
		id: '23PW',
		label: 'Power On'
	},
	{
		id: '2312',
		label: 'Power Standby'
	}
];

instance.prototype.CHOICES_MEDIA_SELECT = [
	{
		id: 'MMS1',
		label: 'Set Media to SD1'
	},
	{
		id: 'MMS2',
		label: 'Set Media to SD2'
	},
	{
		id: 'MMUS',
		label: 'Set Media to USB'
	},
	{
		id: 'MMNE',
		label: 'Set Media to Network'
	}
];

instance.prototype.CHOICES_RECORD_INPUT = [
	{
		id: 'INUB',
		label: 'Rec In to RCA'
	},
	{
		id: 'INBA',
		label: 'Rec In to XLR'
	},
	{
		id: 'INDI',
		label: 'Rec In to Coax'
	},
	{
		id: 'INDB',
		label: 'Rec In to AES/EBU'
	},
	{
		id: 'CHST',
		label: 'Record Stereo'
	},
	{
		id: 'CHML',
		label: 'Record Mono Left'
	},
	{
		id: 'CHMX',
		label: 'Record Mono L+R'
	}
];

instance.prototype.CHOICES_RECORD_ACTIONS = [
	{
		id: '2355',
		label: 'Initiate Recording'
	},
	{
		id: '23Rp',
		label: 'Pause Recording'
	},
	{
		id: '23MT',
		label: 'Split Recording'
	},
	{
		id: 'OR00',
		label: 'One Touch Rec On'
	},
	{
		id: 'OR01',
		label: 'One Touch Rec Off'
	}
];

instance.prototype.CHOICES_RECORD_MONITOR = [
	{
		id: '23RM00',
		label: 'Record Monitor On'
	},
	{
		id: '23RM01',
		label: 'Record Monitor Off'
	},
	{
		id: 'VIFX',
		label: 'Input Volume Fixed'
	},
	{
		id: 'VIVA',
		label: 'Input Volume Variable'
	},
	{
		id: '23V+',
		label: 'L+R up 1 dB'
	},
	{
		id: '23V-',
		label: 'L+R down 1 dB'
	},
	{
		id: '23L+',
		label: 'L up 1 dB'
	},
	{
		id: '23L-',
		label: 'L down 1 dB'
	},
	{
		id: '23R+',
		label: 'R up 1 dB'
	},
	{
		id: '23R-',
		label: 'R down 1 dB'
	},
	{
		id: '23BL',
		label: 'Balance L 1 dB'
	},
	{
		id: '23BR',
		label: 'Balance R 1 dB'
	}
];

instance.prototype.CHOICES_RECORD_FORMAT = [
	{
		id: 'AFPM16',
		label: 'Format PCM 16 bit'
	},
	{
		id: 'AFPM24',
		label: 'Format PCM 24 bit'
	},
	{
		id: 'AFM3064',
		label: 'Format MP3 (64K)'
	},
	{
		id: 'AFM3128',
		label: 'Format MP3 (128K)'
	},
	{
		id: 'AFM3192',
		label: 'Format MP3 (192K)'
	},
	{
		id: 'AFM3256',
		label: 'Format MP3 (256K)'
	},
	{
		id: 'AFM3320',
		label: 'Format MP3 (320K)'
	},
];

instance.prototype.CHOICES_TRACK_PLAYBACK = [
	{
		id: '2353',
		label: 'Play'
	},
	{
		id: '2348',
		label: 'Pause'
	},
	{
		id: '2354',
		label: 'Stop'
	}
];

instance.prototype.CHOICES_TRACK_SELECTION = [
	{
		id: '2333',
		label: 'Restart/Previous Track'
	},
	{
		id: '2332',
		label: 'Next Track'
	},
	{
		id: 'Tr',
		label: 'Select Track'
	},
];

instance.prototype.CHOICES_PANEL_LOCK = [
	{
		id: '23KL',
		label: 'Panel Lock'
	},
	{
		id: '23KU',
		label: 'Panel Unlock'
	},
	{
		id: '23KS',
		label: 'Transport Lock'
	}
];


instance.prototype.init_presets = function () {
	var self = this;
	var input;
	var presets = [];
	var pstSize = '14';

	for (input in self.CHOICES_POWER) {
		presets.push(
			{
				category: 'System',
				label: self.CHOICES_POWER[input].label,
				bank: {
					style: 'text',
					text: self.CHOICES_POWER[input].label,
					size: pstSize,
					color: '16777215',
					bgcolor: 0
				},
				actions: [
					{
						action: 'power',
						options: {
							sel_cmd: self.CHOICES_POWER[input].id,
						}
					}
				]
			}
		);
	}

	for (input in self.CHOICES_RECORD_ACTIONS) {
		presets.push(
			{
				category: 'Recording',
				label: self.CHOICES_RECORD_ACTIONS[input].label,
				bank: {
					style: 'text',
					text: self.CHOICES_RECORD_ACTIONS[input].label,
					size: pstSize,
					color: '16777215',
					bgcolor: 0
				},
				actions: [
					{
						action: 'record',
						options: {
							sel_cmd: self.CHOICES_RECORD_ACTIONS[input].id,
						}
					}
				]
			}
		);
	}

	for (input in self.CHOICES_TRACK_PLAYBACK) {
		presets.push(
			{
				category: 'Track/Title',
				label: self.CHOICES_TRACK_PLAYBACK[input].label,
				bank: {
					style: 'text',
					text: self.CHOICES_TRACK_PLAYBACK[input].label,
					size: pstSize,
					color: '16777215',
					bgcolor: self.rgb(0, 0, 0)
				},
				actions: [
					{
						action: 'track_playback',
						options: {
							sel_cmd: self.CHOICES_TRACK_PLAYBACK[input].id,
						}
					}
				]
			}
		);
	}

	for (input in self.CHOICES_TRACK_SELECTION) {
		presets.push(
			{
				category: 'Track/Title',
				label: self.CHOICES_TRACK_SELECTION[input].label,
				bank: {
					style: 'text',
					text: self.CHOICES_TRACK_SELECTION[input].label,
					size: pstSize,
					color: '16777215',
					bgcolor: self.rgb(0, 0, 0)
				},
				actions: [
					{
						action: 'track_selection',
						options: {
							sel_cmd: self.CHOICES_TRACK_SELECTION[input].id,
						}
					}
				]
			}
		);
	}

	for (input in self.CHOICES_PANEL_LOCK) {
		presets.push({
			category: 'System',
			label: self.CHOICES_PANEL_LOCK[input].label,
			bank: {
				style: 'text',
				text: self.CHOICES_PANEL_LOCK[input].label,
				size: 14,
				color: '16777215',
				bgcolor: self.rgb(0, 0, 0)
			},
			actions: [
				{
					action: 'panel_lock',
					options: {
						sel_cmd: self.CHOICES_PANEL_LOCK[input].id,
					}
				}]
		});
	}

	self.setPresetDefinitions(presets);
};

instance.prototype.actions = function (system) {
	var self = this;

	self.system.emit('instance_actions', self.id, {
		'power': {
			label: 'Power',
			options: [
				{
					type: 'dropdown',
					id: 'sel_cmd',
					label: 'Option',
					default: self.CHOICES_POWER[0].id,
					choices: self.CHOICES_POWER
				}]
		},
		'record': {
			label: 'Record Functions',
			options: [
				{
					type: 'text',
					id: 'info',
					label: 'Recording Control',
					width: 12
				},
				{
					type: 'dropdown',
					id: 'sel_cmd',
					label: 'Command',
					default: '2353',
					choices: self.CHOICES_RECORD_ACTIONS
				},
			]
		},
		'track_playback': {
			label: 'Track Playback',
			options: [
				{
					type: 'text',
					id: 'info',
					label: 'Information',
					width: 12,
					value: 'Track Playback Control.'
				},
				{
					type: 'dropdown',
					id: 'sel_cmd',
					label: 'Option',
					default: '2353',
					choices: self.CHOICES_TRACK_PLAYBACK
				},
			]
		},
		'track_selection': {
			label: 'Track Selection',
			options: [
				{
					type: 'text',
					id: 'info',
					label: 'Information',
					width: 12,
					value: 'Select Track'
				},
				{
					type: 'dropdown',
					id: 'sel_cmd',
					label: 'Option',
					default: '2333',
					choices: self.CHOICES_TRACK_SELECTION
				},
				{
					type: 'number',
					id: 'sel_val',
					label: 'Track Number (1-2000)',
					min: 1,
					max: 2000,
					default: 1,
					required: false,
					range: false,
					regex: self.REGEX_NUMBER
				}
			]
		},
		'panel_lock': {
			label: 'Panel Lock/Unlock',
			options: [
				{
					type: 'dropdown',
					id: 'sel_cmd',
					label: 'Option',
					default: self.CHOICES_PANEL_LOCK[0].id,
					choices: self.CHOICES_PANEL_LOCK
				}]
		}
	});
};

instance.prototype.action = function (action) {
	var self = this;
	var cmd;

	switch (action.action) {
		case 'power':
			cmd = action.options.sel_cmd;
			a_val = "";
			break;

		case 'record':
			cmd = action.options.sel_cmd;
			a_val = "";
			break;

		case 'track_playback':
			cmd = action.options.sel_cmd;
			a_val = "";
			break;

		case 'track_selection':
			if (action.options.sel_cmd == 'Tr') {
				cmd = action.options.sel_cmd;
				a_val = pad4(action.options.sel_val);
			} else {
				cmd = action.options.sel_cmd;
				a_val = "";
			}
			break;

		case 'panel_lock':
			cmd = action.options.sel_cmd;
			a_val = "";
			break;

	}

	if (cmd !== undefined) {
		console.log('Send: @0' + cmd + a_val);
		debug('sending ', "@0" + cmd + a_val, "to", self.config.host);

		if (self.socket !== undefined && self.socket.connected) {
			self.socket.send("@0" + cmd + a_val + "\r");
		} else {
			debug('Socket not connected :(');
		}
	}
};

instance_skel.extendedBy(instance);
exports = module.exports = instance;