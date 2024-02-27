(module
 (type $0 (func (param f64 f64) (result f64)))
 (memory $0 0)
 (export "saw" (func $assembly/index/saw))
 (export "memory" (memory $0))
 (func $assembly/index/saw (param $0 f64) (param $1 f64) (result f64)
  local.get $1
  local.get $0
  f64.mul
  local.tee $0
  local.get $0
  f64.trunc
  f64.sub
  local.get $0
  f64.copysign
  f64.const -0.5
  f64.add
  f64.const 2
  f64.mul
 )
)
