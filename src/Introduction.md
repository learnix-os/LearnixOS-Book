# Writing Operating System In Rust!

_"If you can't explain it simply, you don't understand it well enough." — Albert Einstein_

Hello there![^1]

This is a book on how to write a functioning operating system in rust, from scratch.

I will not use ANY[^2] external libraries, and all of the thought process, code and implementations will be explained and documented here as well as in this [repo](https://github.com/sagi21805/LearnixOS) which will contain all of the implementation!

## Base Knowledge

This book will be technical, and will assume a little bit of a programming knowledge background, but not necessarily in rust

If you are not coming from a low level programming knowledge that's fine!

Just make sure you know this stuff, and probably similar stuff that I am forgetting. Also if in any place on this book I take some things for granted, please, open an issue [here](https://github.com/sagi21805/LearnixOS-Book) and let me know so I could explain it better.

The base things that I expect you to know are:

- Some assembly knowledge. (just understand simple movs, and arithmetic operations, at a very basic level[^3])

- Some knowledge on memory. (what's a pointer, what's an address)

- A knowledge in rust is not _that_ important, but knowing at least one programming language is Important. I myself have some more learning to do on Rust, and in this book I will also explain some great features that it have! 

- A lot of motivation to learn and understand. Although this is a complex subject, in this book I break it down into simple blocks of knowledge that are logical and easier to understand.

## Chapters Of This Book

01. Compiling a stand alone binary

02. Boot loading, Debugging, stages and some legacy stuff

03. Important cpu modes and instructions

04. Paging, writing out own _malloc_ 

05. Utilizing the Interrupt Descriptor Table

06. File systems and Disk Drivers

07. Thinking in terms of processes

08. Writing a shell

09. Running our first program!

10. To be continued (Hopefully virtualization section and loading a vm of other OS)

[^1]: Definitely not a star wars reference
[^2]: Only libraries that remove boilerplate code will be used (And obviously be explained).
[^3]: This is only relevant to the starting stages and some optimizations, and probably a day of learning will be enough