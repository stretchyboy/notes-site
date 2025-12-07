---
title: "Introducing SuperSonic - SuperCollider's audio engine in a Web AudioWorklet. | Sam Aaron"
source: "https://www.patreon.com/posts/introducing-in-141953467"
author:
  - "[[Sam Aaron]]"
published: 2025-10-24
created: 2025-11-29
description: "Get more from Sam Aaron on Patreon"
tags:
  - "clippings"
---
![](https://c10.patreonusercontent.com/4/patreon-media/p/post/141953467/074709f2c2074e55b6b38995ab1423dd/eyJ3IjoxMDgwfQ%3D%3D/1.png?token-hash=iIPkMyvSrJNgfEqXax9GlSuanrb-aD9A2hM8Kzt8Dmo%3D&token-time=1765584000) ![](https://c10.patreonusercontent.com/4/patreon-media/p/post/141953467/074709f2c2074e55b6b38995ab1423dd/eyJ3IjoxMDgwfQ%3D%3D/1.png?token-hash=iIPkMyvSrJNgfEqXax9GlSuanrb-aD9A2hM8Kzt8Dmo%3D&token-time=1765584000)

## Introducing SuperSonic - SuperCollider's audio engine in a Web AudioWorklet.

24 October

For the past one and a half months I've been working on a moonshot project that I've wanted for many years now - combining the synthesis power of SuperCollider with the incredible reach of the web. This meant figuring out how to get SuperCollider's powerful synthesis engine *scsynth* running in a web browser.

TLDR; Here's what I built: [https://sonic-pi.net/supersonic/demo.html](https://sonic-pi.net/supersonic/demo.html)

### The Dream

Having access to SuperCollider in the browser would open up so many interesting doors for both Sonic Pi and Tau5 in addition to a whole plethora of existing and yet to be created musical tools, languages and systems.

### Prior Art

As with all worthwhile things - you're never the first to think about it and luckily 5 years or so ago Hanns Holger Rutz started off in earnest along this exact journey and made incredible progress. He figured out how to compile the almost 30 year old project (which has clearly benefitted from a lot of love and care over the years) into a compile target it was never designed for: WebAssembly. It worked but there were a few caveats - it ran in the main thread - which meant that lots of GUI activity (also running on the main thread) could potentially interrupt the audio resulting in dreaded xruns (when it sounds crunchy because the computer can't feed the speakers a signal in time). It also required the use of the [ScriptProcessorNode](https://developer.mozilla.org/en-US/docs/Web/API/ScriptProcessorNode) which is now unfortunately deprecated and may be removed from browsers at any point. Time passed and the respective codebases diverged, Rutz's work languished until Dennis Scheiba came long at the end of 2024 and blew off the cobwebs and put in a lot of work to prepare [this amazing PR](https://github.com/supercollider/supercollider/pull/6569) to make WebAssembly an official Supercollider compile target.

### Scsynth in an AudioWorklet. A square peg in a round hole.

It was at this point I was working hard on the foundations of Tau5 and was really excited about this potential possibility of using SuperCollider's audio capabilities in the web - given Tau5's web-centred architecture. So I waited patiently until this summer when I started looking into it more closely and fell into the rabbit hole.

I discovered that Web Audio has some really powerful audio capabilities that have replaced the deprecated ScriptProcessorNode - and for good reason. I learned that you can now get access to dedicated high-priority realtime audio threads. Unfortunately that access wasn't straightforward and simple. You can't just run any old WebAssembly in a high priority audio thread. This is due to many critical security and performance reasons that the wonderful web standards people have spent a long time figuring out solutions for. They came up with the the concept of an AudioWorklet - a special kind of process that has strictly limited capabilities:

- no IO,
- no network,
- no memory allocations,
- no main() entry point,
- no c++ initialisers,
- *no chance of running standard scsynth:-(*

These were all things that SuperCollider’s audio engine absolutely relies upon. The ScriptProcessorNode wasn’t nearly as restrictive and allowed scsynth to operate much as it was designed - multiple threads working in harmony, with plenty of IO, networking, and memory allocation. Not to mention expecting a main() entry point and depending on global C++ static initialisers being automatically run during startup to populate critical constants and lookup tables. On attempting to run in an AudioWorklet context each of these became significant technical hurdles to overcome.

> Porting the [SuperCollider WASM PR](https://github.com/supercollider/supercollider/pull/6569) to work with Audioworklets was clearly never ever going to be a simple case of fiddling with some cmake flags.

This is something I learned way too late. Each of the constraints above revealed itself one by one like a towering insurmountable brick wall. Somehow I managed to overcome each one - although each requiring significant effort and patience. The hard part was usually figuring out why it wasn't working and once I had a grasp on that, fixing it usually became somewhat manageable.

### RealTime-NonRealtime Mode

> Sometimes I had to think deeply and often in different ways in order to get things working.

A good example of this was dealing with the no-thread restriction. Whilst exploring the codebase I discovered that the relatively unused NRT (Non RealTime) mode was inherently single threaded. It didn't need multiple threads for its batched operation - nor did it need any network IO. Its job was to read audio jobs from disk, crunch through the audio as fast as possible and write results to disk. As a stroke of luck it turned out that the implementation of this unusual mode directly bypassed two of the main AudioWorklet constraints - it didn't need multiple threads and it didn't require network IO. Therefore the NRT mode of scsynth soon became the principle building block around which I built all the other solutions to the various constraints. This included a new IO system that used SharedBuffer memory for both OSC in and out and also for debug messages to replace the sorely missing printf, repurposing the pre-scheduler I had written for the Bleep system and all the other various fixes needed to convert a traditional C++ app into the rigid constraints of an AudioWorklet.

There's much more to talk about such as blind-debugging, repurposing architecture and collaborating with AI agents - and I will likely expand on various aspects in the future. However, the key thing is that I figured out how to re-purpose the NRT mode to run it in RT via micro-batches. RTNRT. I feel like Frankenstein as he switches on the electricity to wake his monster. It perhaps shouldn't be, but nevertheless it's alive!

So here's SuperSonic: [https://sonic-pi.net/supersonic/demo.html](https://sonic-pi.net/supersonic/demo.html)

It's called SuperSonic in the tradition set by Tim Blechman with his incredible multi-threaded implementation of scsynth called SuperNova. SuperSonic feels similarly suitably distinct architecturally (RTNRT!) to warrant its own identity.

> It's a derivative work of SuperCollider so is released under the same GPL 3 license.

SuperSonic's goal is to serve as a working experimental prototype of how SuperCollider's scsynth-nrt mode could be repurposed to work within an AudioWorklet context. I intend to use it for my ongoing Tau5 work and if that is successful I'm considering using it for a future Sonic Pi release. However, if some part of this work somehow sees its way into the main SuperCollider repository (either directly or as inspiration for a similar approach) then that would be an incredible honour. Still - there are many hurdles to face as more of the surface area of scsynth is gradually tested in this new context. Fingers crossed...

*Now I can get back to working on Tau5 and hooking it up to a brand new super powerful audio engine that just got released...*

---

## Introducing SuperSonic - SuperCollider's audio engine in a Web AudioWorklet.

24 October

For the past one and a half months I've been working on a moonshot project that I've wanted for many years now - combining the synthesis power of SuperCollider with the incredible reach of the web. This meant figuring out how to get SuperCollider's powerful synthesis engine *scsynth* running in a web browser.

TLDR; Here's what I built: [https://sonic-pi.net/supersonic/demo.html](https://sonic-pi.net/supersonic/demo.html)

### The Dream

Having access to SuperCollider in the browser would open up so many interesting doors for both Sonic Pi and Tau5 in addition to a whole plethora of existing and yet to be created musical tools, languages and systems.

### Prior Art

As with all worthwhile things - you're never the first to think about it and luckily 5 years or so ago Hanns Holger Rutz started off in earnest along this exact journey and made incredible progress. He figured out how to compile the almost 30 year old project (which has clearly benefitted from a lot of love and care over the years) into a compile target it was never designed for: WebAssembly. It worked but there were a few caveats - it ran in the main thread - which meant that lots of GUI activity (also running on the main thread) could potentially interrupt the audio resulting in dreaded xruns (when it sounds crunchy because the computer can't feed the speakers a signal in time). It also required the use of the [ScriptProcessorNode](https://developer.mozilla.org/en-US/docs/Web/API/ScriptProcessorNode) which is now unfortunately deprecated and may be removed from browsers at any point. Time passed and the respective codebases diverged, Rutz's work languished until Dennis Scheiba came long at the end of 2024 and blew off the cobwebs and put in a lot of work to prepare [this amazing PR](https://github.com/supercollider/supercollider/pull/6569) to make WebAssembly an official Supercollider compile target.

### Scsynth in an AudioWorklet. A square peg in a round hole.

It was at this point I was working hard on the foundations of Tau5 and was really excited about this potential possibility of using SuperCollider's audio capabilities in the web - given Tau5's web-centred architecture. So I waited patiently until this summer when I started looking into it more closely and fell into the rabbit hole.

I discovered that Web Audio has some really powerful audio capabilities that have replaced the deprecated ScriptProcessorNode - and for good reason. I learned that you can now get access to dedicated high-priority realtime audio threads. Unfortunately that access wasn't straightforward and simple. You can't just run any old WebAssembly in a high priority audio thread. This is due to many critical security and performance reasons that the wonderful web standards people have spent a long time figuring out solutions for. They came up with the the concept of an AudioWorklet - a special kind of process that has strictly limited capabilities:

- no IO,
- no network,
- no memory allocations,
- no main() entry point,
- no c++ initialisers,
- *no chance of running standard scsynth:-(*

These were all things that SuperCollider’s audio engine absolutely relies upon. The ScriptProcessorNode wasn’t nearly as restrictive and allowed scsynth to operate much as it was designed - multiple threads working in harmony, with plenty of IO, networking, and memory allocation. Not to mention expecting a main() entry point and depending on global C++ static initialisers being automatically run during startup to populate critical constants and lookup tables. On attempting to run in an AudioWorklet context each of these became significant technical hurdles to overcome.

> Porting the [SuperCollider WASM PR](https://github.com/supercollider/supercollider/pull/6569) to work with Audioworklets was clearly never ever going to be a simple case of fiddling with some cmake flags.

This is something I learned way too late. Each of the constraints above revealed itself one by one like a towering insurmountable brick wall. Somehow I managed to overcome each one - although each requiring significant effort and patience. The hard part was usually figuring out why it wasn't working and once I had a grasp on that, fixing it usually became somewhat manageable.

### RealTime-NonRealtime Mode

> Sometimes I had to think deeply and often in different ways in order to get things working.

A good example of this was dealing with the no-thread restriction. Whilst exploring the codebase I discovered that the relatively unused NRT (Non RealTime) mode was inherently single threaded. It didn't need multiple threads for its batched operation - nor did it need any network IO. Its job was to read audio jobs from disk, crunch through the audio as fast as possible and write results to disk. As a stroke of luck it turned out that the implementation of this unusual mode directly bypassed two of the main AudioWorklet constraints - it didn't need multiple threads and it didn't require network IO. Therefore the NRT mode of scsynth soon became the principle building block around which I built all the other solutions to the various constraints. This included a new IO system that used SharedBuffer memory for both OSC in and out and also for debug messages to replace the sorely missing printf, repurposing the pre-scheduler I had written for the Bleep system and all the other various fixes needed to convert a traditional C++ app into the rigid constraints of an AudioWorklet.

There's much more to talk about such as blind-debugging, repurposing architecture and collaborating with AI agents - and I will likely expand on various aspects in the future. However, the key thing is that I figured out how to re-purpose the NRT mode to run it in RT via micro-batches. RTNRT. I feel like Frankenstein as he switches on the electricity to wake his monster. It perhaps shouldn't be, but nevertheless it's alive!

So here's SuperSonic: [https://sonic-pi.net/supersonic/demo.html](https://sonic-pi.net/supersonic/demo.html)

It's called SuperSonic in the tradition set by Tim Blechman with his incredible multi-threaded implementation of scsynth called SuperNova. SuperSonic feels similarly suitably distinct architecturally (RTNRT!) to warrant its own identity.

> It's a derivative work of SuperCollider so is released under the same GPL 3 license.

SuperSonic's goal is to serve as a working experimental prototype of how SuperCollider's scsynth-nrt mode could be repurposed to work within an AudioWorklet context. I intend to use it for my ongoing Tau5 work and if that is successful I'm considering using it for a future Sonic Pi release. However, if some part of this work somehow sees its way into the main SuperCollider repository (either directly or as inspiration for a similar approach) then that would be an incredible honour. Still - there are many hurdles to face as more of the surface area of scsynth is gradually tested in this new context. Fingers crossed...

*Now I can get back to working on Tau5 and hooking it up to a brand new super powerful audio engine that just got released...*

---

Get more out of every post with the app.[![](https://image.mux.com/Dqu00VObgwW7iW3pWrPU1iwGasS3xB3CeahZ7XRP7xDw/thumbnail.jpg?token=eyJhbGciOiJSUzI1NiIsImtpZCI6Ik5CY3o3Sk5RcUNmdDdWcmo5MWhra2lEY3Vyc2xtRGNmSU1oSFUzallZMDI0IiwidHlwIjoiSldUIn0.eyJzdWIiOiJEcXUwMFZPYmd3VzdpVzNwV3JQVTFpd0dhc1MzeEIzQ2VhaFo3WFJQN3hEdyIsImV4cCI6MTc2NjUzNDQwMCwiYXVkIjoidCIsIndpZHRoIjo2NDAsImZpdF9tb2RlIjoicHJlc2VydmUiLCJ0aW1lIjoxOC4wfQ.QPJIjfBtRWDLxssnoP7EyyMftFXWwhHzuVWoU9UfVFr6bAg6y1QViAbsmZdbiiEeodcJqD81nAj-Q4UwqJY9KAL1WE1VF_uzedwjsWi2LH5fr2mvkseQmRyJOITP-fJo9LyRtJ1Hl0LheGRM6Ts4u4tENzH5Ugqaw5YP76qoSMIKGgPLD39p2mHcLk5bH4ZHbzD18-pFZpj1rx3-xwJIerIo4eNa_JWLccXB7wIcEpG4bdk-BX-X8CIhjY81eFIyUY3BxrlOGqtYh2X2_gzvspdEyKbn5ZsFPivDxoHF8vdyKiA2rR9xPt2eXxfrmO3b_UdCYYi3WvhA8bEw6A5jMA)](https://www.patreon.com/posts/supersonic-is-143646114)

SuperSonic is Ready for Tau5

0:21

15 November

15 November

20

20

2

2

[View original](https://www.patreon.com/posts/supersonic-is-143646114)[Hey everyone, how are you all doing? This is going to be an epic post - so settle in. Life is pretty good for me. My home finally has a kitchen (after 16 months without one) which is such a wonderful thing. I can heartily definitely recommend homes with a kitchen over ones without one - especially if you have 3 kids. Another wonderful thing that happened is that this weekend we showcased a new experimental live coding system I co-developed with the University of Sheffield and one of my all-time favourite bands - The Black Dog. We gave a 'Techno Masterclass' workshop with the new software followed by a performance by the band where they live coded for the first time on stage! It was incredible. Sheffield Uni even created a lovely press release about the project: https://www.sheffield.ac.uk/city-region/news/sheffield-techno-legends-black-dog-unveil-pioneering-live-coding-system-festival-mind The Black Dog have co-released their code freely available for everyone to play with along with their new EP - Seclusion: http://bleep.sheffield.ac.uk/artist/seclusion Have a play, see what you think - let me know! I'm pretty curious because the work on this project will form the basis of the next version of Sonic Pi - codenamed Tau5. You see, a few years ago, I started working on v5 of Sonic Pi and even published some tech preview releases where I incorporated web-based visualisation software ( Hydra and p5.js ) in a way that enabled live coding of both from Sonic Pi's language. However, I wasn't at all satisfied with it - it turned out that I actually needed to rebuild the GUI in order to integrate the code and visuals in decent way. It had been over 10 years since I last did any serious web development and a lot had changed. I needed to pretty much learn things from scratch. So it was amazing when an opportunity with the University of Sheffield came along to build a live coding system for the web. I jumped on it with both feet. I chose an architecture and tech-stack that I knew would possible to incorporate back into Sonic Pi whilst enabling the exploration of new collaborative jamming possibilities and (obviously) fulling the actual remit of the university project. It was a success. I learned a lot. I'm now ready to take Sonic Pi to the next level. Here's the initial plans. It's a ride I want to take you all on... https://github.com/samaaron/sonic-pi-tau5 Sonic Pi Tau5 This is the ground-up re-development of Sonic Pi. The codename for this work is Tau5. When completed it will become Sonic Pi v5. The main technology for Tau5 is a VM called the BEAM which hosts both the Erlang and Elixir programming languages whilst also enabling low-latency comms with C++ native code for MIDI/Ableton Link/etc. Next Collaboration Tau5 will focus enable next-level live-coding collaboration. It will support co-located, distributed and async jamming sessions. Co-located Jamming - Tau5 jam-sessions will enable multiple participants and by default will always be in sync. This is independent yet co-operative with Ableton Link functionality which will also be included for co-located jamming with other software and systems. Distributed Jamming - Tau5 will enable synchronous world-wide jam sessions using a central server for well-timed coordination of events. Async Jamming - Tau5 will feature immutable code versions which will enable sharing, forking and modification of compositions/data riffs/algorithms that maintains and preserves provenance. Next Language - Tau5Lang Ruby will not feature in Tau5. This is because it's not suited for sharing and running arbitrary code due to security issues. A new language - Tau5Lang - will be developed with syntactical similarity to Sonic Pi's Ruby DSL - but based on top of Lua. Both Lua and Tau5Lang will be supported as firt-class-citizen langauges. This means it will be possible and safe to run other people's code as part of your own - relying on Lua's amazing sandboxing for security against nefarious algorithms. For the Lua implementation we will be using Luerl by Robert Virding. Luerl is a version of Lua written in Erlang running on the BEAM VM. This gives us incredible concurrency opportunities in addition to amazingly low-latency IO performance for handling events. In addition to Lua and Tau5Lang, multiple next-gen mini-DSLs for syntacically precise descriptions of musical ideas are planned. These will all compile down to Lua and work seemlessly with the timing, event and state systems. Next GUI Tau5 will feature a new GUI based on web-technology. This will enable collaborative jam sessions with other devices that have access to a web browser. It will also drastically speed the pace of development and enable much more exciting exploration and experimentation than the previous C++/Qt based GUI. For the web-tech stack we will be using Elixir and Phoenix LiveView. Next Visuals Tau5 will incoporate a variety of existing and wonderful web-tech visual projects. The first two confirmed targets will be Hydra by Olivia Jack and p5.js by the Processing Foundation. You will be able to generate and manipulate visuals directly from Tau5Lang in time with your music. Next Audio Tau5 will feature two independent audio stacks - SuperCollider and WebAudio. SuperCollider will enable all of the power and stability that you already enjoy in Sonic Pi - all of Sonic Pi's synths, FX and audio capabilities will be directly available in Tau5 as you would expect them to be. WebAudio will enable you to stream your music to connected web browser sessions enabling you make sounds in places SuperCollider can't reach. Next IO Tau5 will feature the same rock-solid well-timed OSC and MIDI implementations from Sonic Pi which are already running on the BEAM. We will also add the ability to send and receive events directly to all participants in your jam session for a new range of IO possibilities. Your help is needed... I'm going to start furiously working on this. I only have a couple of months left of funding before I run out, so I'll see how far I get. If you're interested in helping to make this a reality and not just a possibility - please do consider supporting me on Patreon. If you do already - I love you - without your help I wouldn't even be able to consider starting this next evolution of Sonic Pi. I'm going to regularly update you with my progress and let you get your hands on things just as soon as I have something that ticks and whirs. I'll share my roadmap with you shortly. Sonic Pi is still alive Also, don't worry - the existing Sonic Pi is very much alive. I have a new release (v4.6) which I intend to produce in the next week or so. It's got a really amazing new pattern-based function co-developed with the wonderful Dago Sondervan in addition to a number of bug fixes and improved compatibility with Touch Designer. I'll keep working on and maintaining the original Sonic Pi for a long time yet. The future is ours to code...](https://www.patreon.com/posts/announcing-sonic-112605951)

### [Announcing Sonic Pi - Tau5](https://www.patreon.com/posts/announcing-sonic-112605951)

[

Announcing the future of Sonic Pi - Tau5. Join me as I make it a reality...

23 Sept 2024

23 Sept 2024

27

27

23

23

](https://www.patreon.com/posts/announcing-sonic-112605951)[![](https://c10.patreonusercontent.com/4/patreon-media/p/post/135238292/735e13547b594166bafdac638dc3ab41/eyJ3Ijo2NDB9/1.jpg?token-hash=Ff4TFWWsaDAA73RR1klB8GNZmZa77F45hZaf4QH9okc%3D&token-time=1765152000)](https://www.patreon.com/posts/summer-sale-33-135238292)

Summer Sale - 33% off the Sonic Pi introductory course.

29 July

29 July

7

7

0

0

[View original](https://www.patreon.com/posts/summer-sale-33-135238292)[![](https://c10.patreonusercontent.com/4/patreon-media/p/post/136095977/f7c4ca11280a45ed9de3b3e69345704b/eyJ3Ijo2NDB9/1.png?token-hash=BSeLbS4ncINEyg5UHNGcz0CAeAtMM8sTx6XcX_fizuM%3D&token-time=1765152000)](https://www.patreon.com/posts/what-is-tau5-136095977)

What is Tau5?

11 August

11 August

22

22

12

12

[View original](https://www.patreon.com/posts/what-is-tau5-136095977)[![](https://c10.patreonusercontent.com/4/patreon-media/p/post/132330534/590198dd4ec3462db80ad9a7c1f3c11b/eyJ3Ijo2NDB9/1.png?token-hash=RavkmSyjlsIwt8sBY8yKIz1cNkEAzJzs80xNt57qlB0%3D&token-time=1765584000)](https://www.patreon.com/posts/sonic-pi-v4-6-0-132330534)

Sonic Pi v4.6.0 Released

Hey everyone, how are you doing? It's been a while - I really hope that you're all well and doing fantastic things. It's been a roller coast

26 June

26 June

20

20

4

4

[View original](https://www.patreon.com/posts/sonic-pi-v4-6-0-132330534)[![](https://image.mux.com/Dqu00VObgwW7iW3pWrPU1iwGasS3xB3CeahZ7XRP7xDw/thumbnail.jpg?token=eyJhbGciOiJSUzI1NiIsImtpZCI6Ik5CY3o3Sk5RcUNmdDdWcmo5MWhra2lEY3Vyc2xtRGNmSU1oSFUzallZMDI0IiwidHlwIjoiSldUIn0.eyJzdWIiOiJEcXUwMFZPYmd3VzdpVzNwV3JQVTFpd0dhc1MzeEIzQ2VhaFo3WFJQN3hEdyIsImV4cCI6MTc2NjUzNDQwMCwiYXVkIjoidCIsIndpZHRoIjo2NDAsImZpdF9tb2RlIjoicHJlc2VydmUiLCJ0aW1lIjoxOC4wfQ.QPJIjfBtRWDLxssnoP7EyyMftFXWwhHzuVWoU9UfVFr6bAg6y1QViAbsmZdbiiEeodcJqD81nAj-Q4UwqJY9KAL1WE1VF_uzedwjsWi2LH5fr2mvkseQmRyJOITP-fJo9LyRtJ1Hl0LheGRM6Ts4u4tENzH5Ugqaw5YP76qoSMIKGgPLD39p2mHcLk5bH4ZHbzD18-pFZpj1rx3-xwJIerIo4eNa_JWLccXB7wIcEpG4bdk-BX-X8CIhjY81eFIyUY3BxrlOGqtYh2X2_gzvspdEyKbn5ZsFPivDxoHF8vdyKiA2rR9xPt2eXxfrmO3b_UdCYYi3WvhA8bEw6A5jMA)](https://www.patreon.com/posts/supersonic-is-143646114)

SuperSonic is Ready for Tau5

0:21

15 November

15 November

20

20

2

2

[View original](https://www.patreon.com/posts/supersonic-is-143646114)[![](https://c10.patreonusercontent.com/4/patreon-media/p/post/141953467/074709f2c2074e55b6b38995ab1423dd/eyJ3Ijo2NDB9/1.png?token-hash=0sRGKU6tCj24vgSVmQxGXiONVbDmmYFKZmnMk1IDZOc%3D&token-time=1765152000)](https://www.patreon.com/posts/introducing-in-141953467)

Introducing SuperSonic - SuperCollider's audio engine in a Web AudioWorklet.

24 October

24 October

21

21

4

4

[View original](https://www.patreon.com/posts/introducing-in-141953467)[![](https://c10.patreonusercontent.com/4/patreon-media/p/post/136095977/f7c4ca11280a45ed9de3b3e69345704b/eyJ3Ijo2NDB9/1.png?token-hash=BSeLbS4ncINEyg5UHNGcz0CAeAtMM8sTx6XcX_fizuM%3D&token-time=1765152000)](https://www.patreon.com/posts/what-is-tau5-136095977)

What is Tau5?

11 August

11 August

22

22

12

12

[View original](https://www.patreon.com/posts/what-is-tau5-136095977)[![](https://c10.patreonusercontent.com/4/patreon-media/p/post/132330534/590198dd4ec3462db80ad9a7c1f3c11b/eyJ3Ijo2NDB9/1.png?token-hash=JOwed-JTS3p51a35iZGiZCkdrssBFgJEkmDJwm8DHH8%3D&token-time=1765152000)](https://www.patreon.com/posts/sonic-pi-v4-6-0-132330534)

Sonic Pi v4.6.0 Released

Hey everyone, how are you doing? It's been a while - I really hope that you're all well and doing fantastic things. It's been a roller coast

26 June

26 June

20

20

4

4

[View original](https://www.patreon.com/posts/sonic-pi-v4-6-0-132330534)[![](https://c10.patreonusercontent.com/4/patreon-media/p/post/135238292/735e13547b594166bafdac638dc3ab41/eyJ3Ijo2NDB9/1.jpg?token-hash=neRv5ZqzRc_7dgNrAXAmqYU8tUnMLxl51-UhPhBkN-8%3D&token-time=1765584000)](https://www.patreon.com/posts/summer-sale-33-135238292)

Summer Sale - 33% off the Sonic Pi introductory course.

29 July

29 July

7

7

0

0

[View original](https://www.patreon.com/posts/summer-sale-33-135238292)[![](https://image.mux.com/nAD02QHF1WznmUUON00bJHAb4i8lfF01CzNUxOfNxKSwAg/thumbnail.jpg?token=eyJhbGciOiJSUzI1NiIsImtpZCI6Ik5CY3o3Sk5RcUNmdDdWcmo5MWhra2lEY3Vyc2xtRGNmSU1oSFUzallZMDI0IiwidHlwIjoiSldUIn0.eyJzdWIiOiJuQUQwMlFIRjFXem5tVVVPTjAwYkpIQWI0aThsZkYwMUN6TlV4T2ZOeEtTd0FnIiwiZXhwIjoxNzY2OTY2NDAwLCJhdWQiOiJ0Iiwid2lkdGgiOjY0MCwiZml0X21vZGUiOiJwcmVzZXJ2ZSIsInRpbWUiOjIuMH0.Ud96P1N0knGnQgqrFqVp7w0DnYqWQwQQDdKJtfIA91AxA6HIZvKhsNPnBdkphq87g7dwYaLQ2yLPa28MDqsWsGPex0_G4mEhSacL6pnn5QTEEv8us1Pub5AuNfTXXdBZP4JKmY5bwBUOLslUJON4qKH3-38ZaznDR9xxPc-_j-VH9ayhVGFOt3MLled3AS-vDMtojRzno7_Trbca36Mv_86DKfAef3lbUPQ8uITjg9rdn4MTDT8_KKq2-SaVLfYAOdzP-dMUbffirQmhpYJNCLoV2k31vVna8T7UISBaptiFcQxIqIUpE7BJD-YygQZCCT_QM4P0qH3isi0WD61aVQ)](https://www.patreon.com/posts/tau5-now-speaks-121100147)

Tau5 now speaks MIDI

0:13

Hey everyone, A good few years ago I was fairly positive that I'd be moving to using the BEAM and Elixir/Erlang as the core technologies for

30 January

30 January

21

21

8

8

[View original](https://www.patreon.com/posts/tau5-now-speaks-121100147)[![](https://image.mux.com/JwD2FmeVUWyERPHHp7ZsFyp2Yh01UqhfLAJD023vDBrKc/thumbnail.jpg?token=eyJhbGciOiJSUzI1NiIsImtpZCI6Ik5CY3o3Sk5RcUNmdDdWcmo5MWhra2lEY3Vyc2xtRGNmSU1oSFUzallZMDI0IiwidHlwIjoiSldUIn0.eyJzdWIiOiJKd0QyRm1lVlVXeUVSUEhIcDdac0Z5cDJZaDAxVXFoZkxBSkQwMjN2REJyS2MiLCJleHAiOjE3NjY5NjY0MDAsImF1ZCI6InQiLCJ3aWR0aCI6NjQwLCJmaXRfbW9kZSI6InByZXNlcnZlIiwidGltZSI6MH0.Hz5EWhxeh9vcVJyUq0H4qRzEgdMzHncxSSFfiZzm-YbmEGJJt93UVj4wwZoF2H6TZxXr1zSBtp32IomkbAvH2-idRvXpMNCdN5apOmvMQ8IK2QL2T-4_sM2e79pII6vV0Q9sXMHFDIqdbtRZeqcVX7efWg26inYnkrhPQToXZxEPFRmIgV8m1lM6a7wy_LHEzqtA4llpeq2WNd68rlmGmSeAPgF81NceZxYZDdgn1MuWdp7YAbcAxwaPPLKDSmPX-QGKvGdhmBSJ9Opua__HATP13pILTHSpqJz2JbZGJ9N5-1XwNWvWIdG_IoTmS69TadyT42BziA8jDKkEMzIh3g)](https://www.patreon.com/posts/tau5-120456117)

Tau5 Autodiscovery

0:27

Hi everyone, how are you all doing? I'm doing ok. Financially it's still very fragile - but somehow I managed to survive the last few month

21 January

21 January

16

16

4

4

[View original](https://www.patreon.com/posts/tau5-120456117)[![](https://image.mux.com/vfJ9IDTY5PT2WLTnaXzpUrW0000FxJPDX00xqa4Im793mQ/thumbnail.jpg?token=eyJhbGciOiJSUzI1NiIsImtpZCI6Ik5CY3o3Sk5RcUNmdDdWcmo5MWhra2lEY3Vyc2xtRGNmSU1oSFUzallZMDI0IiwidHlwIjoiSldUIn0.eyJzdWIiOiJ2Zko5SURUWTVQVDJXTFRuYVh6cFVyVzAwMDBGeEpQRFgwMHhxYTRJbTc5M21RIiwiZXhwIjoxNzY2OTY2NDAwLCJhdWQiOiJ0Iiwid2lkdGgiOjY0MCwiZml0X21vZGUiOiJwcmVzZXJ2ZSIsInRpbWUiOjIuMH0.gsNs5gDxNFdAOs9GQNNd2jUa8L7ZUtOT5EniKJar73Nhztzqo60Kx0_IkgSpdweFnlhzBfTPabq6WCwRG1H4g5TChej3-aBBCgLlY2HVmlKLlRdN8WMtKYkFbyPYpOoo1n9YGe3lXv6qWVOr7ZMRNWeFwDCKtJ-39_DKD_TYAqmfzrEgzqDN0KcDlyOWqIeyTi4hny3lnFveeLij89P-S0D1-3nSEMHGHuq-QX3QbgFi0R34GxkUsmzlhKsKuCP5PRyxEHGY6QlqfejM-tzRO_PfiqpR6muZAi-P8wAyn-RUforGOjydgujGrWz_MYEkQ9ivKOBQ2Z3zQPmqMXU4FQ)](https://www.patreon.com/posts/tau5-ableton-120675667)

Tau5 + Ableton Link

0:16

Hey everyone, I accidentally added support for Ableton Link to Tau5! (Ableton Link is an open source technology that lets you effortlessly

24 January

24 January

15

15

4

4

[View original](https://www.patreon.com/posts/tau5-ableton-120675667)[Hey everyone, how are you all doing? This is going to be an epic post - so settle in. Life is pretty good for me. My home finally has a kitchen (after 16 months without one) which is such a wonderful thing. I can heartily definitely recommend homes with a kitchen over ones without one - especially if you have 3 kids. Another wonderful thing that happened is that this weekend we showcased a new experimental live coding system I co-developed with the University of Sheffield and one of my all-time favourite bands - The Black Dog. We gave a 'Techno Masterclass' workshop with the new software followed by a performance by the band where they live coded for the first time on stage! It was incredible. Sheffield Uni even created a lovely press release about the project: https://www.sheffield.ac.uk/city-region/news/sheffield-techno-legends-black-dog-unveil-pioneering-live-coding-system-festival-mind The Black Dog have co-released their code freely available for everyone to play with along with their new EP - Seclusion: http://bleep.sheffield.ac.uk/artist/seclusion Have a play, see what you think - let me know! I'm pretty curious because the work on this project will form the basis of the next version of Sonic Pi - codenamed Tau5. You see, a few years ago, I started working on v5 of Sonic Pi and even published some tech preview releases where I incorporated web-based visualisation software ( Hydra and p5.js ) in a way that enabled live coding of both from Sonic Pi's language. However, I wasn't at all satisfied with it - it turned out that I actually needed to rebuild the GUI in order to integrate the code and visuals in decent way. It had been over 10 years since I last did any serious web development and a lot had changed. I needed to pretty much learn things from scratch. So it was amazing when an opportunity with the University of Sheffield came along to build a live coding system for the web. I jumped on it with both feet. I chose an architecture and tech-stack that I knew would possible to incorporate back into Sonic Pi whilst enabling the exploration of new collaborative jamming possibilities and (obviously) fulling the actual remit of the university project. It was a success. I learned a lot. I'm now ready to take Sonic Pi to the next level. Here's the initial plans. It's a ride I want to take you all on... https://github.com/samaaron/sonic-pi-tau5 Sonic Pi Tau5 This is the ground-up re-development of Sonic Pi. The codename for this work is Tau5. When completed it will become Sonic Pi v5. The main technology for Tau5 is a VM called the BEAM which hosts both the Erlang and Elixir programming languages whilst also enabling low-latency comms with C++ native code for MIDI/Ableton Link/etc. Next Collaboration Tau5 will focus enable next-level live-coding collaboration. It will support co-located, distributed and async jamming sessions. Co-located Jamming - Tau5 jam-sessions will enable multiple participants and by default will always be in sync. This is independent yet co-operative with Ableton Link functionality which will also be included for co-located jamming with other software and systems. Distributed Jamming - Tau5 will enable synchronous world-wide jam sessions using a central server for well-timed coordination of events. Async Jamming - Tau5 will feature immutable code versions which will enable sharing, forking and modification of compositions/data riffs/algorithms that maintains and preserves provenance. Next Language - Tau5Lang Ruby will not feature in Tau5. This is because it's not suited for sharing and running arbitrary code due to security issues. A new language - Tau5Lang - will be developed with syntactical similarity to Sonic Pi's Ruby DSL - but based on top of Lua. Both Lua and Tau5Lang will be supported as firt-class-citizen langauges. This means it will be possible and safe to run other people's code as part of your own - relying on Lua's amazing sandboxing for security against nefarious algorithms. For the Lua implementation we will be using Luerl by Robert Virding. Luerl is a version of Lua written in Erlang running on the BEAM VM. This gives us incredible concurrency opportunities in addition to amazingly low-latency IO performance for handling events. In addition to Lua and Tau5Lang, multiple next-gen mini-DSLs for syntacically precise descriptions of musical ideas are planned. These will all compile down to Lua and work seemlessly with the timing, event and state systems. Next GUI Tau5 will feature a new GUI based on web-technology. This will enable collaborative jam sessions with other devices that have access to a web browser. It will also drastically speed the pace of development and enable much more exciting exploration and experimentation than the previous C++/Qt based GUI. For the web-tech stack we will be using Elixir and Phoenix LiveView. Next Visuals Tau5 will incoporate a variety of existing and wonderful web-tech visual projects. The first two confirmed targets will be Hydra by Olivia Jack and p5.js by the Processing Foundation. You will be able to generate and manipulate visuals directly from Tau5Lang in time with your music. Next Audio Tau5 will feature two independent audio stacks - SuperCollider and WebAudio. SuperCollider will enable all of the power and stability that you already enjoy in Sonic Pi - all of Sonic Pi's synths, FX and audio capabilities will be directly available in Tau5 as you would expect them to be. WebAudio will enable you to stream your music to connected web browser sessions enabling you make sounds in places SuperCollider can't reach. Next IO Tau5 will feature the same rock-solid well-timed OSC and MIDI implementations from Sonic Pi which are already running on the BEAM. We will also add the ability to send and receive events directly to all participants in your jam session for a new range of IO possibilities. Your help is needed... I'm going to start furiously working on this. I only have a couple of months left of funding before I run out, so I'll see how far I get. If you're interested in helping to make this a reality and not just a possibility - please do consider supporting me on Patreon. If you do already - I love you - without your help I wouldn't even be able to consider starting this next evolution of Sonic Pi. I'm going to regularly update you with my progress and let you get your hands on things just as soon as I have something that ticks and whirs. I'll share my roadmap with you shortly. Sonic Pi is still alive Also, don't worry - the existing Sonic Pi is very much alive. I have a new release (v4.6) which I intend to produce in the next week or so. It's got a really amazing new pattern-based function co-developed with the wonderful Dago Sondervan in addition to a number of bug fixes and improved compatibility with Touch Designer. I'll keep working on and maintaining the original Sonic Pi for a long time yet. The future is ours to code...](https://www.patreon.com/posts/announcing-sonic-112605951)

### [Announcing Sonic Pi - Tau5](https://www.patreon.com/posts/announcing-sonic-112605951)

[

Announcing the future of Sonic Pi - Tau5. Join me as I make it a reality...

23 Sept 2024

23 Sept 2024

27

27

23

23

](https://www.patreon.com/posts/announcing-sonic-112605951)[Hi there, I'm currently on my way to New York. I'm going to deliver a keynote tomorrow morning at Code BEAM Lite NYC which is a one-day conference of all things BEAM. What's BEAM I hear some of you ask? It's the technology that underpins Erlang and Elixir and also Luerl - all languages that I've been working extensively with recently. It's the technology that underpins both Sonic Pi's IO subsystem and Tau5. Tech conferences are always interesting places to hang out - and Erlang/Elixir/Luerl/Gleam people in particular are always a wonderful source of conversation. I typically learn a huge amounts from a million discussions and leave exhausted in a a good way. They can also a lonely place for an artist to be. There's often so much external validation and micro-judging that can easily dismiss an artist outright and pour jet fuel on imposter syndrome. I remember attending a Clojure conference many years ago to talk about Overtone - a live coding system I used to work on waaaay back when. I overheard some programmers discussing a technical problem that felt very familiar to me. I had encountered something similar within the internals of Overtone and so I mentioned it to them. They seemed genuinely interested in my approach and solution until one of them asked "So, what kind of system are you working on?". As soon as I replied "a live music language" they scoffed and instantly disengaged. If your tech isn't making a lot of / any money - no external validation for you. So of course, this is a general attitude I work hard to fight. Artist programmers are so far from being irrelevant - they're often working on the edge of possibility. Exploring the fringes of programming. It's in those seemingly unprofitable fringes that the exciting stuff is found. New approaches, new techniques, new social perspectives, so many new questions to be asked. I think there's so much that business programmers can learn from artistic programmers - just as much as the inverse is true. Luckily the lovely organisers of BEAM Lite NYC agree which is why they invited me to keynote for them. I'm therefore going to be proudly wearing my artist hat at BEAM Lite NYC and share my journey from Overtone to Sonic Pi to bleep to Tau5. I'm really looking forward to the conversations and knowledge exchange.](https://www.patreon.com/posts/beam-me-to-new-115988103)

### [BEAM me to New York](https://www.patreon.com/posts/beam-me-to-new-115988103)

[

Hi there, I'm currently on my way to New York. I'm going to deliver a keynote tomorrow morning at Code BEAM Lite NYC.

14 Nov 2024

14 Nov 2024

18

18

10

10

](https://www.patreon.com/posts/beam-me-to-new-115988103)[![](https://image.mux.com/L02pe5NppH8oIcx01ufhWCRfqJ11E9LcpY4wq017QbPM4Q/thumbnail.jpg?token=eyJhbGciOiJSUzI1NiIsImtpZCI6Ik5CY3o3Sk5RcUNmdDdWcmo5MWhra2lEY3Vyc2xtRGNmSU1oSFUzallZMDI0IiwidHlwIjoiSldUIn0.eyJzdWIiOiJMMDJwZTVOcHBIOG9JY3gwMXVmaFdDUmZxSjExRTlMY3BZNHdxMDE3UWJQTTRRIiwiZXhwIjoxNzY2OTY2NDAwLCJhdWQiOiJ0Iiwid2lkdGgiOjY0MCwiZml0X21vZGUiOiJwcmVzZXJ2ZSIsInRpbWUiOjIuMH0.ML3Sy_OldkZ2ghr54GBnDBLxVKc039h3mLauS9Ghm31_Zjxjqjx7hlvUn18aZNP7II8uxEkb2G6V5iovoGvq6ww3da-z0Dd74Lggb6hW6VYMbvwKSnt2AK_qWhJlBFKsSKx7lcxr5SP9aeY82dI22jgVwUfTAegYM2F0HDJiKpvgFIIxw-iuM6CpoUscwyWidyDLGJ4MPdCDl-eFuUIPmyfp05_tOzAbPw_m_cHYdEhEwwQQgxwvughTlvJFWAYNAcobnuUMWXWdoB07wiVjyPeG1lRI-nBuwBOeqylLd1MkyK33sjy2Gf22eqmZnckJkMtP5eLbW6pYm7EqMYCiUQ)](https://www.patreon.com/posts/tau5-dev-update-113532594)

Tau5 Dev Update #2

0:09

New Tau5 Dev Update. Today I discuss the new Monaco-based editor, Hydra visualisation integration and Windows compatibility. Let's go!

7 Oct 2024

7 Oct 2024

13

13

20

20

[View original](https://www.patreon.com/posts/tau5-dev-update-113532594)[![](https://c10.patreonusercontent.com/4/patreon-media/p/post/114136608/14c4aa5bf124422a889320eb27e32c4e/eyJ3Ijo2NDB9/1.png?token-hash=tsKWlVryGK44qO0DrHmjaB1J391lxSp6oNoCKNcyB4o%3D&token-time=1765584000)](https://www.patreon.com/posts/financial-sonic-114136608)

Financial transparency & Sonic Pi Development

Hey everyone, it's time to be transparent about my finances and talk about what I'm going to do with the development time I have left...

16 Oct 2024

16 Oct 2024

13

13

17

17

[View original](https://www.patreon.com/posts/financial-sonic-114136608)

;