import Vue from "vue";
import Vuex from "vuex";
import players from "./modules/players";
import session from "./modules/session";
import fabledJSON from "../data/fabled.json";
import jinxesJSON from "../data/hatred.json";

Vue.use(Vuex);

const set = key => ({ grimoire }, val) => {
  grimoire[key] = val;
};

const toggle = key => ({ grimoire }, val) => {
  if (val === true || val === false) {
    grimoire[key] = val;
  } else {
    grimoire[key] = !grimoire[key];
  }
};

const clean = id => id.toLocaleLowerCase().replace(/[^a-z0-9]/g, "");

// global data maps
const fabled = new Map(fabledJSON.map(role => [role.id, role]));

// jinxes
let jinxes = {};
try {
  jinxes = new Map(
    jinxesJSON.map(({ id, hatred }) => [
      clean(id),
      new Map(hatred.map(({ id, reason }) => [clean(id), reason]))
    ])
  );
} catch (e) {
  console.error("couldn't load jinxes", e);
}

// base definition for custom roles
const customRole = {
  id: "",
  name: "",
  image: "",
  ability: "",
  edition: "custom",
  firstNight: 0,
  firstNightReminder: "",
  otherNight: 0,
  otherNightReminder: "",
  reminders: [],
  remindersGlobal: [],
  jinxes: [],
  setup: false,
  team: "townsfolk",
  isCustom: true
};

export default new Vuex.Store({
  modules: {
    players,
    session
  },
  state: {
    version: "1.0.0",
    grimoire: {
      isNight: false,
      isMuted: false,
      isImageOptIn: true,
      isStatic: false,
      zoom: 0,
      background: "",
      audioThreshold: 150
    },
    modals: {
      version: false,
      edition: false,
      fabled: false,
      gameState: false,
      nightOrder: false,
      reference: false,
      reminder: false,
      role: false,
      roles: false,
      draw: false,
      voteHistory: false,
      input: false,
      groupChat: false
    },
    roles: new Map(),
    otherTravelers: new Map(),
    fabled,
    jinxes,
    // 本剧本自带的相克条目（team 是 jinx / a jinxed，不是角色）
    scriptJinxes: [],
    states: [],
    teamsNames: {
      townsfolk: "镇民",
      outsider: "外来者",
      minion: "爪牙",
      demon: "恶魔"
    },
    firstNight: [],
    otherNight: []
  },
  getters: {
    /**
     * Return all custom roles, with default values and non-essential data stripped.
     * Role object keys will be replaced with a numerical index to conserve bandwidth.
     * @param roles
     * @returns {[]}
     */
    customRolesStripped: ({ roles }) => {
      const customRoles = [];
      const customKeys = Object.keys(customRole);
      const strippedProps = [
        "firstNightReminder",
        "otherNightReminder",
        "isCustom"
      ];
      roles.forEach(role => {
        if (!role.isCustom) {
          customRoles.push({ id: role.id });
        } else {
          const strippedRole = {};
          for (let prop in role) {
            if (strippedProps.includes(prop)) {
              continue;
            }
            const value = role[prop];
            if (customKeys.includes(prop) && value !== customRole[prop]) {
              strippedRole[customKeys.indexOf(prop)] = value;
            }
          }
          customRoles.push(strippedRole);
        }
      });
      return customRoles;
    }
  },
  mutations: {
    setZoom: set("zoom"),
    setBackground: set("background"),
    toggleMuted: toggle("isMuted"),
    toggleStatic: toggle("isStatic"),
    toggleNight: toggle("isNight"),
    toggleImageOptIn: toggle("isImageOptIn"),
    toggleModal({ modals }, name) {
      if (modals.input) this.state.session.isTyping = false;
      if (name) {
        modals[name] = !modals[name];
      }
      for (let modal in modals) {
        if (modal === name) continue;
        modals[modal] = false;
      }
    },
    /**
     * Store custom roles
     * @param state
     * @param roles Array of role IDs or full role definitions
     */
    setCustomRoles(state, roles) {
      const oldRoles = Object.keys(state.session.isUseOldRole).filter(key => state.session.isUseOldRole[key] === true);
      roles = roles.map(role => {
        return oldRoles.includes(role.id) ? { ...role, id: role.id + 'old1' } : role; // use role if not ticked, add old1 if ticked
      })
      const processedRoles = roles
        // replace numerical role object keys with matching key names
        .map(role => {
          if (role[0]) {
            const customKeys = Object.keys(customRole);
            const mappedRole = {};
            for (let prop in role) {
              if (customKeys[prop]) {
                mappedRole[customKeys[prop]] = role[prop];
              }
            }
            return mappedRole;
          } else {
            return role;
          }
        })
        // clean up role.id
        .map(role => {
          role.id = clean(role.id);
          return role;
        })
        // map existing roles to base definition or pre-populate custom roles to ensure all properties
        .map(
          role =>
            state.roles.get(role.id) ||
            Object.assign({}, customRole, role)
        )
        // default empty icons and placeholders, clean up firstNight / otherNight
        .map(role => {
          // 缺图的角色按阵营塞占位图 key（roleIcon.js 再解析成图床地址）
          if (!role.image) {
            role.imageAlt = // map team to generic icon
              {
                townsfolk: "good",
                outsider: "outsider",
                minion: "minion",
                demon: "evil",
                fabled: /^bootlegger\d+$/.test(role.id) ? "bootlegger" : "fabled", // 直接使用私货商人图标
                loric: /^bootlegger\d+$/.test(role.id) ? "bootlegger" : "loric"
              }[role.team] || "custom";
          }
          role.firstNight = Math.abs(role.firstNight);
          role.otherNight = Math.abs(role.otherNight);
          return role;
        })
        // filter out roles that don't match an existing role and also don't have name/ability/team
        .filter(role => role.name && role.ability && role.team)
        // sort by team
        .sort((a, b) => b.team.localeCompare(a.team));
      // convert to Map without Fabled
      state.roles = new Map(
        processedRoles
          .filter(
            role =>
              role.team !== "fabled" &&
              role.team !== "loric" &&
              // 相克规则（jinx / a jinxed）不是角色，混进来就会在换角色面板里
              // 出现一个叫「维齐尔&调查员」的假角色
              role.team !== "jinx" &&
              role.team !== "a jinxed"
          )
          .map(role => {
            if (role.team === "traveller") role.team = "traveler";
            return role;
          })
          .map(role => [role.id, role])
      );
      // 相克单独存一份，给顶栏的「相克」面板用
      state.scriptJinxes = processedRoles
        .filter(role => role.team === "jinx" || role.team === "a jinxed")
        .map(role => ({
          id: role.id,
          name: role.name,
          ability: role.ability || "",
          image: role.image || ""
        }));
      // update Fabled to include custom Fabled from this script
      state.fabled = new Map([
        ...processedRoles.filter(r => r.team === "fabled" || r.team === "loric").map(r => [r.id, r]),
        ...fabledJSON.map(role => [role.id, role])
      ]);
      // 不再内置官方角色库，剧本外的旅行者没有数据来源，置空即可
      //（DrawModal 对空 Map 自动隐藏「加旅行者」入口）
      state.otherTravelers = new Map();
    },
    setTeamsNames(state, names) {
      state.teamsNames = names;
    }
  }
});
