import Versions from './components/Versions'
import electronLogo from './assets/electron.svg'
import { repl, evalScope, note } from '@strudel/core'
import {
  getAudioContext,
  webaudioOutput,
  initAudio,
  initAudioOnFirstClick,
  registerSynthSounds
} from '@strudel/webaudio'
import {Udels} from "../../../../../website/src/components/Udels/Udels"
import { transpiler } from '@strudel/transpiler'
// import { AudioContext } from 'node-web-audio-api';
// global.AudioContext = AudioContext

const tune = `samples('github:tidalcycles/dirt-samples')
setcps(1)
stack(
  // amen
  n("0 1 2 3 4 5 6 7")
  .sometimes(x=>x.ply(2))
  .rarely(x=>x.speed("2 | -2"))
  .sometimesBy(.4, x=>x.delay(".5"))
  .s("amencutup")
  .slow(2)
  .room(.5)
  ,
  // bass
  sine.add(saw.slow(4)).range(0,7).segment(8)
  .superimpose(x=>x.add(.1))
  .scale('G0 minor').note()
  .s("sawtooth").decay(.1).sustain(0)
  .gain(.4).cutoff(perlin.range(300,3000).slow(8)).resonance(10)
  .degradeBy("0 0.1 .5 .1")
  .rarely(add(note("12")))
  ,
  // chord
  note("Bb3,D4".superimpose(x=>x.add(.2)))
  .s('sawtooth').cutoff(1000).struct("<~@3 [~ x]>")
  .decay(.05).sustain(.0).delay(.8).delaytime(.125).room(.8)
  ,
  // alien
  s("breath").room(1).shape(.6).chop(16).rev().mask("<x ~@7>")
  ,
  n("0 1").s("east").delay(.5).degradeBy(.8).speed(rand.range(.5,1.5))
).reset("<x@7 x(5,8)>")`

// import console from 'console'

// const con = new console.Console(process.stdout, process.stderr);
evalScope(
  import('@strudel/core'),
  import('@strudel/mini'),
  import('@strudel/webaudio'),
  import('@strudel/tonal')
)
const ctx = getAudioContext()
const { evaluate, scheduler } = repl({
  defaultOutput: webaudioOutput,
  getTime: () => ctx.currentTime,
  transpiler
})

function App() {
 
  initAudio()
  // initAudioOnFirstClick()
  registerSynthSounds()

  const evald = () => {
    ctx.resume()

    const pattern = note('c3', ['eb3', 'g3']).s('sawtooth')

    scheduler.setPattern(pattern)
    scheduler.start()
    // console.log(transpiler)
    // evaluate(tune)
  }
  return <Udels></Udels>

  return (
    <>
      <div className="actions">
        <div className="action">
          <a target="_blank" rel="noreferrer" onClick={evald}>
            Send IPC
          </a>
        </div>
      </div>
      {tune}
    </>
  )
}

export default App
