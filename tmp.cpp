
#include "LogicLens.h"

// --- INJECTED GLOBAL INPUTS ---

std::string s = "dosmzmb";
std::string t = "zqfkchk";


struct __LL_Init {
    __LL_Init() {
        __ll_set_var("s", s);
        __ll_set_var("t", t);

    }
} __ll_init_instance;

// ------------------------------

// --- USER CODE ---
function isIsomorphic(s, t) {
  return true;
}
// -----------------
