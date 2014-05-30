(function() {
  function SoundManager() {
    var self = this,
        sounds = {},
        activeSounds = {},
        loadingSounds = {},

        globalVolume = 1,

        onStateChange,

        EXTENSION_TO_PLAY = '',
        STORAGE_KEY = 'sound';
        
    this.active = null;
    
    this.init = function init(options) {
      !options && (options = {});
  
      onStateChange = options.onStateChange || function(){};
      
      determinePlayableAudioType();
      loadSavedState();
    };
    
    this.enable = function enable() {
      if (self.active === true || !EXTENSION_TO_PLAY) {
        return;
      }
      
      for (var id in activeSounds) {
        activeSounds[id].play();
      }
      self.active = true;
      updateStorage();
      onStateChange(self.active);
    };
    
    this.disable = function disable() {
      if (self.active === false) {
        return;
      }
      
      self.stop();
      self.active = false;
      updateStorage();
      onStateChange(self.active);
    };
    
    this.toggle = function toggle() {
      self[self.active? 'disable' : 'enable']();
    };
    
    this.getActive = function getActive() {
      return activeSounds;
    };
    
    this.load = function load(soundsToLoad, soundLoadCallback) {
      for (var id in soundsToLoad) {
        var soundConfig = soundsToLoad[id];
        
        if (typeof soundConfig === 'string') {
          soundConfig = {
            "src": soundConfig,
            "volume": 1,
            "loop": false,
            "onlyOne": false
          };
        }
        
        soundConfig.src += '.' + EXTENSION_TO_PLAY;
        
        var sound = new Audio();
        sound.preload = 'auto';
        
        if (soundLoadCallback) {
          sound.addEventListener('canplaythrough', function onLoadingSoundReady() {
            soundLoadCallback.call(this);
          });
        }
        
        // save the sound in a temp object, since Chrome have problems
        // if the object dies at the end of this function
        // the "canplaythrough" event sometimes just doesn't fire
        loadingSounds[soundConfig.src] = sound;
        
        sound.src = soundConfig.src;
        sound.load();
        
        sounds[id] = soundConfig;
      }
    };

    // TODO: directional sound using WebAudioAPI!
    this.play = function play(id, onPlayFinished) {
      var activeSound = activeSounds[id];
      
      if (activeSound && activeSound.loop && self.active) {
        activeSound.play();
        onPlayFinished && onPlayFinished();
        return true;
      }

      var sound = new Audio(),
          soundConfig = sounds[id];
      
      if (!soundConfig) {
        return false;
      }
      
      if (self.active) {
        sound.preload = true;
        sound.autoplay = true;
      } else if (onPlayFinished) {
        window.setTimeout(function() {
          if (sound.reported) {
            return;
          }
          
          sound.reported = true;
          onPlayFinished(sound);
        }, 600);
        
        sound.addEventListener('canplaythrough', function onSoundReady() {
          // this make sure a sound isn't reported more than once
          // for some reason this event can be called multiple times
          if (this.reported) {
            return;
          }
          this.reported = true;
          
          var duration = this.duration > 5? this.duration : this.duration * 1000;
          // fire the callback only after the sound's duration, to not break game logic
          window.setTimeout(function() {
            onPlayFinished(this);
          }, duration);
        });
      }

      sound.volume = soundConfig.volume * globalVolume;
      sound.loop = !!soundConfig.loop;
      
      (function(sound, id) {
        sound.addEventListener('ended', function onSoundEnded() {
          if (soundConfig.onlyOne) {
            delete activeSounds[id]
          }
          onPlayFinished && onPlayFinished(sound);
        });
      }(sound, id));
      
      sound.src = soundConfig.src;
      
      activeSounds[id] = sound;
      
      return true;
    };

    this.stop = function stop(idToStop, shouldResetTime) {
      if (!self.active) {
          return;
      }
      
      if (idToStop && idToStop in activeSounds) {
          activeSounds[idToStop].pause();
          if (shouldResetTime) {
            try {
              activeSounds[idToStop].currentTime = 0;
            } catch(ex) {
              
            }
          }
      } else {
        for (var id in activeSounds) {
          activeSounds[id].pause();
        }
      }
    };
    
    this.setVolume = function setVolume(id, volume) {
      sounds[id] && (sounds[id].volume = volume);
      activeSounds[id] && (activeSounds[id].volume = sounds[id].volume * globalVolume);
    };

    this.setGlobalVolume = function setGlobalVolume(volume) {
      if (volume === globalVolume) {
        return;
      }

      globalVolume = volume;

      for (var id in activeSounds) {
        activeSounds[id].volume = sounds[id].volume * globalVolume;
      }
    };
    
    // check which sound files the browser can play
    function determinePlayableAudioType() {
      var testAudio = new Audio();
      if (testAudio.canPlayType('audio/mp3')) {
        EXTENSION_TO_PLAY = 'mp3';
      } else if (testAudio.canPlayType('audio/ogg')) {
        EXTENSION_TO_PLAY = 'ogg';
      }
    }
    
    // get the saved state from the machine's storage
    function loadSavedState() {
      var savedState = true;
      
      try {
        if (STORAGE_KEY in localStorage) {
          savedState = (localStorage[STORAGE_KEY] == 1);
        }
      } catch(ex) {
      }
      
      self[savedState? 'enable' : 'disable']();
    }
    
    // save the current state in the localStorage, for next entries to the page
    function updateStorage() {
      try {
        localStorage[STORAGE_KEY] = self.active? 1 : 0;
      } catch(ex) {
      }
    }
  }

  window.SoundManager = new SoundManager();
}());