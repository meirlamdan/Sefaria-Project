import Sefaria from "./sefaria/sefaria";
import {InterfaceText, requestWithCallBack, TitleVariants, ToggleSet} from "./Misc";
import $ from "./sefaria/sefariaJquery";
import {AdminEditor} from "./AdminEditor";
import {Reorder} from "./CategoryEditor";
import React, {useState, useEffect} from "react";


const TopicEditor = ({origData, onCreateSuccess, close, origWasCat}) => {
    const [data, setData] = useState({...origData, catSlug: origData.origCategorySlug || "",
                                enTitle: origData.origEn, heTitle: origData.origHe || "", heDescription: origData?.origDesc?.he || "",
                                enDescription: origData?.origDesc?.en || "",
                                enCategoryDescription: origData?.origCategoryDesc?.en,
                                heCategoryDescription: origData?.origCategoryDesc?.he,
                                enAltTitles: origData?.origEnAltTitles || [],
                                heAltTitles: origData?.origHeAltTitles || [],
                                birthPlace: origData.origBirthPlace || "", heBirthPlace: origData.origHeBirthPlace || "",
                                birthYear: origData.origBirthYear || "", heDeathPlace: origData.origHeDeathPlace || "",
                                deathYear: origData.origDeathYear || "", era: origData.origEra || "",
                                deathPlace: origData.origDeathPlace || ""
                                });
    const isNew = !('origSlug' in origData);
    const [savingStatus, setSavingStatus] = useState(false);
    const [isAuthor, setIsAuthor] = useState(origData.origCategorySlug === 'authors');
    const [isCategory, setIsCategory] = useState(origWasCat);  // initialize to True if the topic originally was a category
                                                                  // isCategory determines whether user can edit categoryDescriptions of topic
    const subtopics = Sefaria.topicTocPage(origData.origSlug);
    const [sortedSubtopics, setSortedSubtopics] = useState(subtopics?.sort(Sefaria.sortTopicsCompareFn)
                                                                                .filter(x => x.slug !== origData.origSlug) // dont include topics that are self-linked
                                                                                || []);
    const [isChanged, setIsChanged] = useState(false);

    const toggle = function() {
      setSavingStatus(savingStatus => !savingStatus);
    }


    const handleCatChange = function(e) {
      data.catSlug = e.target.value;
      //logic is: if it starts out originally a category, isCategory should always be true, otherwise, it should depend solely on 'Main Menu'
      const newIsCategory = origWasCat || e.target.value === Sefaria._("Main Menu");
      setIsCategory(newIsCategory);
      setIsAuthor(data.catSlug === 'authors');
      setData({...data});
    }

    let slugsToTitles = Sefaria.slugsToTitles();
    let specialCases = {
        "": {"en": "Choose a Parent Topic", "he": Sefaria.translation('he', "Choose a Parent Topic")},
        "Main Menu": {"en": "Main Menu", "he": Sefaria.translation('he', "Main Menu")}
    };
    slugsToTitles = Object.assign(specialCases, slugsToTitles);
    const catMenu =   <div className="section">
                                            <label><InterfaceText>Parent Topic</InterfaceText></label>
                                            <div className="categoryChooserMenu">
                                                <select key="topicCats" id="topicCats" onChange={handleCatChange}>
                                                    {Object.keys(slugsToTitles).map(function (tempSlug, i) {
                                                        const tempTitle = Sefaria.interfaceLang === 'english' ? slugsToTitles[tempSlug].en : slugsToTitles[tempSlug].he;
                                                        return <option key={i} value={tempSlug} selected={data.catSlug === tempSlug}>{tempTitle}</option>;
                                                    })}
                                                </select>
                                            </div>
                                    </div>;

    const updateData = function(newData) {
        setIsChanged(true);
        setData(newData);
        console.log(newData);
    }
    const validate = async function () {
        if (!isChanged) {
            alert("You haven't changed any of the fields.");
            return false;
        }
        if (data.catSlug === "") {
          alert(Sefaria._("Please choose a category."));
          return false;
        }
        if (data.enTitle.length === 0) {
          alert(Sefaria._("Title must be provided."));
          return false;
        }
        if (sortedSubtopics.length > 0 && !isNew) {
            await saveReorderedSubtopics();  // make sure subtopics reordered before saving topic information below
        }
        saveTopic();
    }
    const saveReorderedSubtopics = function () {
         const url = `/api/topic/reorder`;
         const postCategoryData = {topics: sortedSubtopics};
         requestWithCallBack({url, data: postCategoryData, setSavingStatus, redirect: () => window.location.href = "/topics"});
    }

    const prepData = () => {
        let postData = {...data, "description": {"en": data.enDescription, "he": data.heDescription}, "title": data.enTitle,
            "heTitle": data.heTitle};
        if (isCategory) {
            postData = {...postData, "catDescription": {"en": data.enCategoryDescription, "he": data.heCategoryDescription}};
        }
        if (data?.era && Sefaria.util.inArray(data.era, Sefaria._eras) === -1) {
            delete postData.era;
        }
        postData.altTitles = {};
         // alt titles implemented using TitleVariants which contains list of objects with 'name' property.
        postData.altTitles.en = postData.enAltTitles.map(x => x.name);
        postData.altTitles.he = postData.heAltTitles.map(x => x.name);
        postData.category = data.catSlug;
        if (!isNew) {
          postData = {...postData, origCategory: data.origCategorySlug, origDescription: data.origDesc,
                    origSlug: data.origSlug};
          if (isCategory) {
            postData.origCatDescription = data.origCategoryDesc;
          }
        }

        return postData;
    }

    const saveTopic = function () {
        toggle();
        const postData = prepData();
        let postURL = isNew ? "/api/topic/new" : `/api/topics/${data.origSlug}`;
        const postJSON = JSON.stringify(postData);
        $.post(postURL, {"json": postJSON}, function (result) {
            if (result.error) {
                toggle();
                alert(result.error);
            } else {
                const newSlug = result.slug;
                if (onCreateSuccess) {
                    onCreateSuccess(newSlug);
                }
                else {
                    window.location.href = `/topics/${newSlug}`;
                }
            }
        }).fail(function (xhr, status, errorThrown) {
            alert("Unfortunately, there may have been an error saving this topic information: " + errorThrown.toString());
        });
    }

    const deleteObj = function() {
        const url = `/api/topic/delete/${data.origSlug}`;
        requestWithCallBack({url, type: "DELETE", redirect: () => window.location.href = "/topics"});
    }
    let items = ["Title", "Hebrew Title", "English Description", "Hebrew Description", "Category Menu"];
    if (isCategory) {
        items.push("English Short Description");
        items.push("Hebrew Short Description");
    }
    if (isAuthor) {
        const authorItems = ["English Alternate Titles", "Hebrew Alternate Titles", "Birth Place", "Hebrew Birth Place", "Birth Year", "Place of Death", "Hebrew Place of Death", "Death Year", "Era"];
        authorItems.forEach(x => items.push(x));
    }
    return <AdminEditor title="Topic Editor" close={close} catMenu={catMenu} data={data} savingStatus={savingStatus}
                        validate={validate} deleteObj={deleteObj} updateData={updateData} isNew={isNew}
                        items={items} extras={
                            [isNew ? null :
                                <Reorder subcategoriesAndBooks={sortedSubtopics}
                                         updateOrder={setSortedSubtopics}
                                         displayType="topics"/>,
                            ]
                        } />;
}


export {TopicEditor};