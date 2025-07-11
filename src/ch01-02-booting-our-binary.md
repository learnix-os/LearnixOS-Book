# Booting Our Binary

In the previous section, we created a stand alone binary, which is not linked to any standard library. But if you looked closely, and inspected the binary, you would see that although we defined our output format to be 'binary' in the linker script, we got a different format. Why is that?

## Understanding Rust Targets

The compiler of rust, `rustc` is a cross-compiler, which means it can compile the same source code into multiple architectures and operating systems.
This provides us with a lot of flexibility, but it is the core reason for our problem. This is because you are probably compiling this code from a computer with a regular operating system (Linux, Windows or MacOS) which rustc supports, which means that is it's `default target`. To see your default target, you can run `rustc -vV` and look at the `host` section.

The target contains information for the `rustc` compiler about which header should the binary have, what is the pointer and int size, what instruction set to use, and more information about the features of the cpu that it could utilize.
So, because we compiled our code just with `cargo build`, cargo, which under the hood uses `rustc`, compiled our code to our default target, which resulted in a binary that is operating specific and not a truly stand alone even though we used `#![no_std]`.

> **Note:**
>
> if you want to see the information of your computer target, use the following command
> ```
> rustc +nightly -Z unstable-options --print target-spec-json
> ```

## Custom Rust Target

To boot our binary, we need to create a custom target that will specify that no vendor or operating system in our [_target triple_](https://wiki.osdev.org/Target_Triplet) is used, and that it will contain the right [architecture](https://simple.wikipedia.org/wiki/Computer_architecture). But, what architecture we need?

In this guide, the operating system that we build will be compatible with the x86_64 computer architecture (and maybe other architectures in the far far future). So, for that we will need to understand what an x86_64 chip expects at boot time.

## BIOS Boot Process

When our computer (or virtual machine) powers on, the first software that the CPU encounters is the [BIOS](https://en.wikipedia.org/wiki/BIOS), which is a piece of software that is responsible to perform hardware initialization during the computer start up. It comes pre installed on the motherboard and as an OS developer, we can't interfere or modify the BIOS in any way.

The last thing BIOS does before handing to us the control over the computer, is to load one sector (512 bytes) form the boot device (can be hard-disk, cd-rom, floppy-disk etc) to memory address `0x7c00` if the sector is considered `vaild`, which means that it has the `BIOS Boot Signature` at the end of it, which is the byte sequence `0x55` followed by `0xAA` in offset bytes 510 and 511 respectively.

At this time for backward compatibility reasons, the computer starts at a reduced instruction set, at a 16bit mode called [_real mode_](https://en.wikipedia.org/wiki/Real_mode) which provides direct access to the BIOS interface, and access to all I/O or peripheral device. This mode lacks support for memory protection, multitasking, or code privileges, and has only 1Mib of address space. Because of these limitation we want to escape it as soon as possible, but that is a problem that we will solve later (Maybe add link to when this is done).

## Building Our Target

With this information, we understand that we will need to build a target that will support 16bit real mode.
Unfortunately, if we look at all of the available targets, we would see that there is no target that support this unique need, but, luckily, Rust allows us to create custom targets!

As a clue, we can try and peak on the builtin targets, and check if there is something similar that we can borrow. For example, my target, which is the x86_64-unknown-linux-gnu looks like this:
```json
{
  "arch": "x86_64",
  "cpu": "x86-64",
  "crt-static-respected": true,
  "data-layout": "e-m:e-p270:32:32-p271:32:32-p272:64:64-i64:64-i128:128-f80:128-n8:16:32:64-S128",
  "dynamic-linking": true,
  "env": "gnu",
  "has-rpath": true,
  "has-thread-local": true,
  "link-self-contained": {
    "components": [
      "linker"
    ]
  },
  "linker-flavor": "gnu-lld-cc",
  "llvm-target": "x86_64-unknown-linux-gnu",
  "max-atomic-width": 64,
  "metadata": {
    "description": "64-bit Linux (kernel 3.2+, glibc 2.17+)",
    "host_tools": true,
    "std": true,
    "tier": 1
  },
  "os": "linux",
  "plt-by-default": false,
  "position-independent-executables": true,
  "pre-link-args": {
    "gnu-cc": [
      "-m64"
    ],
    "gnu-lld-cc": [
      "-m64"
    ]
  },
  "relro-level": "full",
  "stack-probes": {
    "kind": "inline"
  },
  "static-position-independent-executables": true,
  "supported-sanitizers": [
    "address",
    "leak",
    "memory",
    "thread",
    "cfi",
    "kcfi",
    "safestack",
    "dataflow"
  ],
  "supported-split-debuginfo": [
    "packed",
    "unpacked",
    "off"
  ],
  "supports-xray": true,
  "target-family": [
    "unix"
  ],
  "target-pointer-width": "64"
}
```
This target has some useful info that we can use, like useful keys, such as `arch`, `linker-flavor`, `cpu` and more, that we will use in our target, and even the `data-layout` that we will copy almost entirely. Our final, 16bit target, will look like this:

[build/targets/16bit_target.json](https://github.com/sagi21805/LearnixOS/blob/master/build/targets/16bit_target.json) (The real file in the project!)
```json,filename=build/targets/16bit_target.
{
// The general architecture to compile to, x86 cpu architecture in our case
"arch": "x86",

// Specific cpu target - Intel i386 CPU Which is the original 32-bit cpu
// Which is compatible for 16-bit real mode instructions
"cpu": "i386",

// Describes how data is laid out in memory for the LLVM backend, split by '-':
// e          -> Little endieness (E for big endiness)
// m:e        -> ELF style name mangling
// p:32:32    -> The default pointer is 32-bit with 32-bit address space
// p270:32:32 -> Special pointer type ID-270 with 32-bit size and alignment
// p271:32:32 -> Special pointer type ID-271 with 32-bit size and alignment
// p271:64:64 -> Special pointer type ID-272 with 64-bit size and alignment
// i128:128   -> 128-bit integers are 128-bit aligned
// f64:32:64  -> 64-bit floats are 32-bit aligned, and can also be 64-bit aligned
// n:8:16:32  -> Native integers are 8-bit, 16-bit, 32-bit
// S128       -> Stack is 128-bit allgined
"data-layout": "e-m:e-p:32:32-p270:32:32-p271:32:32-p272:64:64-i128:128-f64:32:64-f80:32-n8:16:32-S128",

// No dynamic linking is supported, because there is no OS runtime loader.
"dynamic-linking": false,

// This target is allowed to produce executable binaries.
"executables": true,

// Use LLD's GNU compatible frontend (`ld.lld`) for linking.
"linker-flavor": "ld.lld",

// Use the Rust provided LLD linker binary (bundled with rustup)
// This makes that our binary can compiled on every machine that has rust.
"linker": "rust-lld",

// LLVM target triple, code16 indicates for 16bit code generation
"llvm-target": "i386-unknown-none-code16",

// The widest atomic operation is 64-bit (TODO! Check if this can be removed)
"max-atomic-width": 64,

// Disable position independent executables
// The position of this executable matters because it is loaded at address 0x7c00
"position-independent-executables": false,

// Disable the redzone optimization, which saves in advance memory
// on a functions stack without moving the stack pointer which saves some instructions
// because the prologue and epilogue of the function are removed
// this is a convention, which means that the guest OS
// won't overwrite this otherwise 'volatile' memory
"disable-redzone": true,

// The default int is 32-bit
"target-c-int-width": "32",

// The default pointer is 32-bit
"target-pointer-width": "32",

// The endieness, little or big
"target-endian": "little",

// panic strategy, also set on cargo.toml
// this aborts execution instead of unwinding
"panic-strategy": "abort",

// There is no target OS
"os": "none",

// There is not target vendor
"vendor": "unknown",

// Use static relocation (no dynamic symbol tables or relocation at runtime)
// Also means that the code is statically linked.
"relocation-model": "static"
}
```
Now, with this code, and the linker script from the last section, we can finally compile our code and boot it, so lets try and do that!

To compile our code, we just need to run the following command:
```
cargo build --release --target 16bit_target.json
```

> **Default Segments In Rust Are:**
> - **.text**   - Includes the code of our program, which is the machine code that is generated for all of the functions
>   ```rust
>   fn some_function(x: u32, y: u32) -> u32 {
>     return x + y;
>   }
>   ```
> - **.data**   - Includes the initialized data of our program, like static variables.
>   ```rust
>   static VAR: u32 = 42;
>   ```
> - **.bss**    - Includes the uninitialized data of our program
>   ```rust
>   static mut MESSAGE: String = MaybeUninit::uninit();
>   ```
> - **.rodata** - Includes the read-only data of our program
>   ```rust
>   static mut MESSAGE: &'static str = "Hello World!";
>   ```
