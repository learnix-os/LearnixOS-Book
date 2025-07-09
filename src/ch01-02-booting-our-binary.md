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
So, firstly, let's look if there is 

As a clue, we can try and peak on the builtin targets, and check if there is something similar that we can borrow.


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
