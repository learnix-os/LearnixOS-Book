# Compiling a Standalone Binary

Most of the time when we write our code in rust, we have a support for the [_standard library_](https://doc.rust-lang.org/std/)_._ Which not only helps us to connect with the underlying operating system,  it provides us a lot of functionality like the println! macro, basic data structures like Vec, or LinkedList etc. Some of these features we can find in the rust [_core_](https://doc.rust-lang.org/stable/core/) library which provides some of rusts features in a dependency free way, while for other features, we will have to write their implementation ourselves. So just before we dive down to write our Operating System, we need to understand how to compile out binary in a standalone way, and how to link it with the core library.

First, crate a rust project.

```bash
cargo init <project_name> 
cd <project_name>
```

Your main file, should look something like this:

```rust
fn main() {
    println!("Hello World!");
}
```

This can easily be run on you computer with `cargo run` but it uses the standard library.

## Ignoring The Standard Library

As mentioned before we don't want to depend on the standard library because it is meant for already existing operating systems. To ignore it, simply add `#!\[no\_std]` on the top of our crate.

If we then try to compile out create, we get this error massage:

```rust
error: cannot find macro `println` in this scope
 --> src/main.rs:4:5
  |
4 |     println!("Hello, world!");
  |     ^^^^^^^

error: `#[panic_handler]` function required, but not found

error: unwinding panics are not supported without std
  |
  = help: using nightly cargo, use -Zbuild-std with panic="abort" to avoid unwinding
  = note: since the core library is usually precompiled with panic="unwind", rebuilding your crate with panic="abort" may not be enough to fix the problem
```

When breaking this error down we see there are 3 main errors

* Cannot find macro `println`
* `#[panic handler]` function is required
* Unwinding panics are not supported without std.

The first error is more obvious, because we don't have our standard library, the `println` does not exist, so we simply need to remove the line that uses it.

