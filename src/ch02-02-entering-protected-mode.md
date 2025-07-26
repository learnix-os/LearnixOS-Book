# Entering Protected Mode

_"With great power comes great responsibility." — Voltaire / Spider-Man_

---

After we read from disk, it will enable us to write much more code, because we are not limited to 512 bytes.
But just before we do that, we don't want to limit ourselves only to 16bit instructions. 
For that we need to enter [`protected mode`](https://en.wikipedia.org/wiki/Protected_mode) which will allow us to unlock some cpu features such as 32bit instructions.

Entering protected mode is not a difficult task, which only requires initializing the [`global descriptor table`](https://wiki.osdev.org/Global_Descriptor_Table) which is a CPU structure that will be discussed in depth bellow, and setting the protected mode bit in [`control register 0`](https://en.wikipedia.org/wiki/Control_register)

## The Global Descriptor Table

This is a structure that is specific to the x86 cpu family, and it contains information about the different segments, which is valuable in the CPU.

In this book, we will not talk about memory management using segments, because it is mostly not used in modern operating systems. Instead we will only create a minimal and temporary table, that will let us continue to protected mode and will serve us until we toggle [`memory paging`](https://en.wikipedia.org/wiki/Memory_paging)

The global descriptor table, is not a difficult structure to understand, it is just an array, and each entry of the array has a `global descriptor table entry` structure.
This entry is more complex and it looks like this: 

<!-- Top bitfields: 5 adjacent 64–32 sections -->
<div style="display: flex; justify-content: space-between; flex-wrap: nowrap; margin-top: 1em;">
  <table style="width: 21.5%;">
    <thead><tr><th>63 – 56</th></tr></thead>
    <tbody><tr><td><b>Base</b><br>31 – 24</td></tr></tbody>
  </table>

  <div style="width: 1%; visibility: hidden;"></div>
  <table style="width: 13%;">
    <thead><tr><th>55 – 52</th></tr></thead>
    <tbody><tr><td><b>Flags</b><br>3 – 0</td></tr></tbody>
  </table>

  <div style="width: 1%; visibility: hidden;"></div>
  <table style="width: 13%;">
    <thead><tr><th>51 – 48</th></tr></thead>
    <tbody><tr><td><b>Limit</b><br>19 - 16</td></tr></tbody>
  </table>

  <div style="width: 1%; visibility: hidden;"></div>
  <table style="width: 24.25%;">
    <thead><tr><th>47 – 40</th></tr></thead>
    <tbody><tr><td><b>Access Byte</b><br>7 – 0</td></tr></tbody>
  </table>

  <div style="width: 1%; visibility: hidden;"></div>
  <table style="width: 24.25%;">
    <thead><tr><th>39 – 32</th></tr></thead>
    <tbody><tr><td><b>Base</b><br>23 - 16</td></tr></tbody>
  </table>
</div>

<!-- Bottom: aligned 16-bit sections -->
<div style="display: flex; justify-content: space-between; flex-wrap: nowrap; margin-top: 1em;">
  <!-- Spacer columns to align 31–16 under 63–48 -->
  <table style="width: 49.5%;">
    <thead><tr><th>31 – 16</th></tr></thead>
    <tbody><tr><td><b>Base</b><br>15 – 0</td></tr></tbody>
  </table>

  <!-- Spacer to skip middle 2% (not critical) -->
  <div style="width: 1%; visibility: hidden;"></div>

  <!-- Align 15–0 under 47–32 -->
  <table style="width: 49.5%;">
    <thead><tr><th>15 – 0</th></tr></thead>
    <tbody><tr><td><b>Limit</b><br>15 – 0</td></tr></tbody>
  </table>
</div>

But what are these fields?
- **Base:** this is a 32-bit value, which is split on the entire entry and it represents the address of where the segment begins.
- **Limit:** this is a 20-bit value, which is split on the entire entry, and it represents the size of the segment.
- **Access Byte:** this is sections includes flags that provide the access privileges of this segment.
- **Flags:** general flags for the entry.

Fortunately, all of these fields can become structs and together they will represent a single global descriptor table entry.

```rust,fp=shared/cpu_utils/src/structures/global_descriptor_table.rs
struct AccessByte(u8);

struct LimitFlags(u8);

#[repr(C)]
struct GlobalDescriptorTableEntry32 {
    limit_low: u16,
    base_low: u16,
    base_mid: u8,
    access_byte: AccessByte,
    /// Low 4 bits limit high 4 bits flags
    limit_flags: LimitFlags,
    base_high: u8,
}
```
Both the `AccessByte` and the `LimitFlags` and more structures throughout the book, are using one bit flags, which represents some inner settings to the cpu.
Although setting one bit flag is easy, and can be done with `1 << bit_number` to set the nth bit, we would like abstractions such as `set_<flag_name>`, which are more readable and error prone.
But, if we would do that to every flag, it will be **A LOT** of boiler plate code.
For this reason, rust provides us with an amazing macro system 
> **Note:** If you are unfamiliar with macros, and especially rust macros, a little explanation will be given in this book, to read more about rust's macros, click [here](https://doc.rust-lang.org/book/ch20-05-macros.html)

So, to mitigate all of this boiler plate, will will create a `flag!` macro.
The goal of this macro is to use the flag name, and it's bit number to generate utility functions that are readable and error prone.
Our macro will look like this: 

```rust, fp=shared\common\src\macros.rs
#[macro_export]
/// This macro will obtain `flag_name` and the corresponding `bit_number`
///
/// With this information it will automatically generate three methods
///
/// 1. `set_<flag_name>`: set the bit without returning self
/// 2. `<flag_name>`: set the bit and will return self
/// 3. `unset_<flag_name>:` unset the bit without returning self
/// 4. `is_<flag_name>`: return true if the flag is set or false if not
macro_rules! flag {
    ($flag_name:ident, $bit_number:literal) => {
        #[inline]
        #[allow(dead_code)]
        #[allow(unused_attributes)]
        /// Sets the corresponding flag
        ///
        /// `This method is auto-generated`
        pub const fn ${concat(set_, $flag_name)}(&mut self) {
            self.0 |= 1 << $bit_number;
        }

        #[inline]
        #[allow(dead_code)]
        #[allow(unused_attributes)]
        /// Sets the corresponding flag while returning self
        ///
        /// `This method is auto-generated`
        pub const fn $flag_name(self) -> Self {
            Self(self.0 | (1 << $bit_number))
        }

        #[inline]
        #[allow(dead_code)]
        #[allow(unused_attributes)]
        /// Unset the corresponding flag
        ///
        /// `This method is auto-generated`
        pub const fn ${concat(unset_, $flag_name)}(&mut self) {
            self.0 &= !(1 << $bit_number)
        }

        /// Checks if the corresponding flag in set to 1
        ///
        /// `This method is auto-generated`
        #[inline]
        #[allow(dead_code)]
        #[allow(unused_attributes)]
        pub const fn ${concat(is_, $flag_name)}(&self) -> bool {
            self.0 & (1 << $bit_number) != 0
        }
    };
}
```

While this macro seems complex, it will just create four functions.
The `${concat(word1, word2)}`, combines both of the ident's to a single one, and uses the `macro_metavar_expr_concat` feature.

To see what this macro can do, we can you the amazing [`cargo-expand`](https://crates.io/crates/cargo-expand) tool created by [`David Tolnay`](https://github.com/dtolnay)

<details>
<summary>To see an example</summary>

A simple code like this: 

```rust
struct Example(u8);

impl Example {
    flag!(first, 1);
    flag!(second, 2);
    flag!(third, 3);
}
```

Will be expanded to this: 

```rust
struct Example(u8);
impl Example {
    #[inline]
    #[allow(dead_code)]
    #[allow(unused_attributes)]
    /// Sets the corresponding flag
    ///
    /// `This method is auto-generated`
    pub const fn set_first(&mut self) {
        self.0 |= 1 << 1;
    }
    #[inline]
    #[allow(dead_code)]
    #[allow(unused_attributes)]
    /// Sets the corresponding flag while returning self
    ///
    /// `This method is auto-generated`
    pub const fn first(self) -> Self {
        Self(self.0 | (1 << 1))
    }
    #[inline]
    #[allow(dead_code)]
    #[allow(unused_attributes)]
    /// Unset the corresponding flag
    ///
    /// `This method is auto-generated`
    pub const fn unset_first(&mut self) {
        self.0 &= !(1 << 1);
    }
    /// Checks if the corresponding flag in set to 1
    ///
    /// `This method is auto-generated`
    #[inline]
    #[allow(dead_code)]
    #[allow(unused_attributes)]
    pub const fn is_first(&self) -> bool {
        self.0 & (1 << 1) != 0
    }
    #[inline]
    #[allow(dead_code)]
    #[allow(unused_attributes)]
    /// Sets the corresponding flag
    ///
    /// `This method is auto-generated`
    pub const fn set_second(&mut self) {
        self.0 |= 1 << 2;
    }
    #[inline]
    #[allow(dead_code)]
    #[allow(unused_attributes)]
    /// Sets the corresponding flag while returning self
    ///
    /// `This method is auto-generated`
    pub const fn second(self) -> Self {
        Self(self.0 | (1 << 2))
    }
    #[inline]
    #[allow(dead_code)]
    #[allow(unused_attributes)]
    /// Unset the corresponding flag
    ///
    /// `This method is auto-generated`
    pub const fn unset_second(&mut self) {
        self.0 &= !(1 << 2);
    }
    /// Checks if the corresponding flag in set to 1
    ///
    /// `This method is auto-generated`
    #[inline]
    #[allow(dead_code)]
    #[allow(unused_attributes)]
    pub const fn is_second(&self) -> bool {
        self.0 & (1 << 2) != 0
    }
    #[inline]
    #[allow(dead_code)]
    #[allow(unused_attributes)]
    /// Sets the corresponding flag
    ///
    /// `This method is auto-generated`
    pub const fn set_third(&mut self) {
        self.0 |= 1 << 3;
    }
    #[inline]
    #[allow(dead_code)]
    #[allow(unused_attributes)]
    /// Sets the corresponding flag while returning self
    ///
    /// `This method is auto-generated`
    pub const fn third(self) -> Self {
        Self(self.0 | (1 << 3))
    }
    #[inline]
    #[allow(dead_code)]
    #[allow(unused_attributes)]
    /// Unset the corresponding flag
    ///
    /// `This method is auto-generated`
    pub const fn unset_third(&mut self) {
        self.0 &= !(1 << 3);
    }
    /// Checks if the corresponding flag in set to 1
    ///
    /// `This method is auto-generated`
    #[inline]
    #[allow(dead_code)]
    #[allow(unused_attributes)]
    pub const fn is_third(&self) -> bool {
        self.0 & (1 << 3) != 0
    }
}
```
</details>

So now, without a lot of boiler plate, we can define our `AccessByte` and `LimitFlags`.
```rust,fp=shared/cpu_utils/src/structures/global_descriptor_table.rs
impl AccessByte {
    /// Creates an access byte with all flags turned off.
    pub const fn new() -> Self {
        Self(0)
    }

    // Is this a valid segment?
    // for all active segments this should be turned on.
    flag!(present, 7);

    /// Sets the privilege level while returning self.
    /// This is corresponding to the cpu ring of this segment
    /// 0 is commonly called kernel mode, 4 is commonly called user mode
    pub const fn dpl(mut self, level: u8) -> Self {
        self.0 |= (level & 0x3) << 5;
        self
    }
    // Is this a code / data segment or a system segment.
    flag!(code_or_data, 4);
    // Will this segment contains executable code?
    flag!(executable, 3);
    // Will the segment grow downwards?
    // relevant for non executable segments
    flag!(direction, 2);
    // Can this code be executed from lower privilege segments.
    // relevant to executable segments
    flag!(conforming, 2);
    // Can this segment be read or it is only executable?
    // relevant for code segment
    flag!(readable, 1);
    // Is this segment writable?
    // relevant for data segments
    flag!(writable, 1);
}

impl LimitFlags {
    /// Creates a default limit flags with all flags turned off.
    pub const fn new() -> Self {
        Self(0)
    }
    // Toggle on paging for this segment (limit *= 0x1000)
    flag!(granularity, 7);
    // Is this segment going to use 32bit mode?
    flag!(protected, 6);
    // Set long mode flag, this will also clear protected mode
    flag!(long, 5);
}
```


Now, just before creating a `new` function to our entry, we don't want each time to specify the base in three parts and the limit in two parts, instead we want the `new` function to take care of that.
This will complicate it a bit, but will provide much more friendly interface. 

```rust,fp=shared/cpu_utils/src/structures/global_descriptor_table.rs
impl GlobalDescriptorTableEntry32 {
    pub const fn new(
        base: u32, 
        limit: u32, 
        access_byte: AccessByte, 
        flags: LimitFlags
    ) -> Self {

        // Split base into the appropriate parts
        let base_low = (base & 0xffff) as u16;
        let base_mid = ((base >> 0x10) & 0xff) as u8; 
        let base_high = ((base >> 0x18) & 0xff) as u8;
        // Split limit into the appropriate parts
        let limit_low = (limit & 0xffff) as u16;
        let limit_high = ((limit >> 0x10) & 0xf) as u8;
        // Combine the part of the limit size with the flags
        let limit_flags = flags.0 | limit_high;
        Self {
            limit_low,
            base_low,
            base_mid,
            access_byte,
            limit_flags: LimitFlags(limit_flags),
            base_high,
        }
    }
}
```
## Jumping to the next stage!

Now, after understanding the global descriptor table, we want to jump to the next stage.
This will require us to create and load a temporary global descriptor table.

Each table must have at least three entries, an initial `null` entry that is filled with zeros, which is always required as the first entry, a `data` entry for the data segment so we can read and write to memory, and code entry so we can execute code.

Together it will all look like this:

```rust,fp=shared/cpu_utils/src/structures/global_descriptor_table.rs
// This structure will seem to rust as `dead code` because we only initialize
// and not use it's fields directly, to remove the warning, we add this attribute.
#[allow(dead_code)]
pub struct GlobalDescriptorTable {
    null: GlobalDescriptorTableEntry32,
    code: GlobalDescriptorTableEntry32,
    data: GlobalDescriptorTableEntry32,
}

impl GlobalDescriptorTable {
    /// Creates default global descriptor table for protected mode
    pub const fn protected_mode() -> Self {
        GlobalDescriptorTable {
            // Null entry, fields with zeros.
            null: GlobalDescriptorTableEntry32::new(
                0, 
                0, 
                AccessByte::new(), 
                LimitFlags::new()
            ),
            code: GlobalDescriptorTableEntry32::new(
                // The base is zero, because our code is aligned to 0x0 address
                0,
                // The size is max, so we won't have any limit
                0xfffff,
                // We mark this as code segment, with the highest privileges
                AccessByte::new()
                    .present()
                    .dpl(0)
                    .code_or_data()
                    .executable()
                    .readable(),
                // Set the units of the limit to 4kib and set 32bit mode.
                LimitFlags::new().granularity().protected(),
            
            ),
            data: GlobalDescriptorTableEntry32::new(
                // The base is zero, because our data is aligned to 0x0 address
                0,
                // The size is max, so we won't have any limit
                0xfffff,
                // We mark this as code segment, with the highest privileges
                AccessByte::new().present().dpl(0).code_or_data().writable(),
                // Set the units of the limit to 4kib and set 32bit mode.
                LimitFlags::new().granularity().protected(),
            ),
        }
    }
}
```

If you noticed, all of the functions that we defined so far are marked with `const` this is useful because we can create our global descriptor table as a static variable, which will be in the binary.
This is useful because it will make our initialization of the global descriptor table to be in compile time.

So, the only thing left to do is to load the global descriptor table. This can be done with the `lgdt` instruction which loads the `Global Descriptor Table Register` with our table. This is a hidden register that includes information about our global descriptor table, like it's size and address in memory. 

We will create a `load` function that will create this register structure, and will load it to the cpu.

```rust,fp=shared/cpu_utils/src/structures/global_descriptor_table.rs
// The packed and repr(C) attributes are very important.
// The repr(C) ensures the order of the data is as specified.
// The packed attribute will ignore `Data Structure Alignment`
#[repr(C, packed(2))]
pub struct GlobalDescriptorTableRegister32 {
    // This is the size of our table in bytes - 1.
    pub limit: u16,
    // This is the address of where we store the table.
    pub base: *const GlobalDescriptorTable,
}

impl GlobalDescriptorTable {
    
    pub unsafe fn load(&'static self) {
        let global_descriptor_table_register: GlobalDescriptorTableRegister32 = {
            GlobalDescriptorTableRegister32 {
                // Set the limit to the size - 1 
                limit: (size_of::<GlobalDescriptorTable>() - 1) as u16,
                // Set the base to the address of the table 
                // (This is the same as the address of the var, because it is static)
                base: self as *const GlobalDescriptorTable,
            }
        };
        unsafe {
            asm!(
                // Clear Interrupt Flag, This is done because we can't let random 
                // hardware interrupts to interfere with the lgdt instruction
                // This will also be useful in the future until we set up interrupts 
                "cli",
                // Then, load the table using our now created register.
                "lgdt [{}]",
                in(reg) &global_descriptor_table_register,
                options(readonly, nostack, preserves_flags)
            );
        }
    }
}
```

Now, to apply all of the created functionality, enable protected mode, and to jump to the next stage, we add the following code to our entry function.

```rust,fp=kernel/stages/first_stage/src/main.rs

// Static variable that holds our table
static GLOBAL_DESCRIPTOR_TABLE: GlobalDescriptorTable = {
    GlobalDescriptorTable::protected_mode();
}
pub fn first_stage() -> ! {

    // Load Global Descriptor Table
    GLOBAL_DESCRIPTOR_TABLE.load();

    // Set the Protected Mode bit in control register 0
    asm!(
        "mov eax, cr0",
        "or eax, 1",
        "mov cr0, eax",
        options(readonly, nostack, preserves_flags)
    );

    // Jump to the next stage
    // We perform a long jump, which is a jump that also loads our segment
    // from the global descriptor table.
    //
    // The segment is the offset in the global descriptor table  
    // which for the code segment is 0x10 (For readability, added an enum)
    //
    // The `next_stage` is the address of the next stage.
    // This is a variable in our constants that I want you to think what is should be
    // as always, the answer, or the var that I chose, will be in the Walkthrough
    asm!(
        "jmp ${section}, ${next_stage}",
        section = const Sections::KernelCode as u8,
        next_stage = const SECOND_STAGE_OFFSET,
    );
}
```
