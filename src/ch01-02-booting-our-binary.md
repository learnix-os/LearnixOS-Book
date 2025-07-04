# Booting Our Binary


> **Default Segments In Rust Are:**
> - .text   - Includes the code of our program, which is the machine code that is generated for all of the functions
> ```rust
> fn some_function(x: u32, y: u32) -> u32 {
>   return x + y;
> }
> ```
> - .data   - Includes the initialized data of our program, like static variables.
> ```rust
> static VAR: u32 = 42;
> ```
> - .bss    - Includes the uninitialized data of our program
> ```rust
> static mut MESSAGE: String = MaybeUninit::uninit();
> ```
> - .rodata - Includes the read-only data of our program
> ```rust
> static mut MESSAGE: &'static str = "Hello World!";
> ```
